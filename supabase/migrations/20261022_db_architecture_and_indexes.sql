-- ==============================================================================
-- QUARK SAAS V3 - DATABASE ARCHITECTURE, RESILIENCE & COMPATIBILITY ENHANCEMENTS
-- Project: sumydaewtszecrvdgoku (QUARK SAAS V3)
-- Date: 2026-10-22
-- ==============================================================================

-- 1. Virtual Alias Generated Columns for Backward Compatibility on Opportunities
-- Solves PostgREST schema mismatches where legacy frontend queries requested value, pipeline_stage, client_name
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS value numeric GENERATED ALWAYS AS (amount) STORED,
  ADD COLUMN IF NOT EXISTS pipeline_stage text GENERATED ALWAYS AS (status) STORED,
  ADD COLUMN IF NOT EXISTS client_name text GENERATED ALWAYS AS (title) STORED;

-- 2. Foreign Key Indexes Optimization
-- Resolves unindexed foreign key flagged during audit
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);

-- 3. Proposal Triggers Hardening & Foreign Key Resilience
-- Ensures proposal creation, editing, and duplication never fail on missing user_id or opportunity_id
CREATE OR REPLACE FUNCTION handle_proposal_defaults()
RETURNS trigger AS $$
BEGIN
  -- Fallback user_id to admin user if null
  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(NEW.created_by, auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  -- Ensure user_id actually exists in auth.users
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    NEW.user_id := '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid;
  END IF;

  -- Fallback created_by
  IF NEW.created_by IS NULL THEN
    NEW.created_by := COALESCE(NEW.user_id, auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  -- Ensure created_by actually exists in auth.users
  IF NEW.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.created_by) THEN
    NEW.created_by := '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid;
  END IF;

  -- Validate opportunity_id against opportunities table
  IF NEW.opportunity_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.opportunities WHERE id = NEW.opportunity_id) THEN
      NEW.opportunity_id := NULL;
    END IF;
  END IF;

  -- If opportunity_id is still NULL and lead_id is provided, check if it matches an opportunity
  IF NEW.opportunity_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    IF NEW.lead_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      IF EXISTS (SELECT 1 FROM public.opportunities WHERE id = NEW.lead_id::uuid) THEN
        NEW.opportunity_id := NEW.lead_id::uuid;
      END IF;
    END IF;
  END IF;

  -- If lead_id is NULL and opportunity_id is present, mirror it
  IF NEW.lead_id IS NULL AND NEW.opportunity_id IS NOT NULL THEN
    NEW.lead_id := NEW.opportunity_id::text;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Proposal XP Gamification Safety Function
-- Isolates gamification side-effects so failures never abort proposal transactions
CREATE OR REPLACE FUNCTION xp_on_proposal()
RETURNS trigger AS $$
BEGIN
  IF tg_op = 'DELETE' THEN
    BEGIN
      IF old.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        DELETE FROM public.xp_events WHERE ref_id = old.id::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN old;
  ELSIF tg_op = 'INSERT' THEN
    BEGIN
      PERFORM public.award_xp(
        new.created_by,
        'proposta',
        15,
        CASE WHEN new.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN new.id::uuid ELSE NULL END,
        CASE WHEN new.lead_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN new.lead_id::uuid ELSE NULL END
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  ELSE
    BEGIN
      IF (new.sent_at IS NOT NULL AND old.sent_at IS NULL) THEN
        PERFORM public.award_xp(
          new.created_by,
          'envio',
          10,
          CASE WHEN new.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN new.id::uuid ELSE NULL END,
          CASE WHEN new.lead_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN new.lead_id::uuid ELSE NULL END
        );
      END IF;
      IF new.status = 'aceita' AND old.status IS DISTINCT FROM 'aceita' THEN
        PERFORM public.award_xp(
          new.created_by,
          'aceite',
          150,
          CASE WHEN new.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN new.id::uuid ELSE NULL END,
          CASE WHEN new.lead_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN new.lead_id::uuid ELSE NULL END
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Safe Projects JSONB Sync
CREATE OR REPLACE FUNCTION sync_projects_jsonb()
RETURNS trigger AS $$
BEGIN
  IF NEW.data IS NOT NULL THEN
    NEW.client_id := COALESCE(NEW.client_id, NEW.data->>'clientId', NEW.data->>'client_id');
    NEW.client_name := COALESCE(NEW.client_name, NEW.data->>'clientName', NEW.data->>'client_name');
    NEW.client_phone := COALESCE(NEW.client_phone, NEW.data->>'clientPhone', NEW.data->>'client_phone');
    NEW.city := COALESCE(NEW.city, NEW.data->>'city');
    IF NEW.system_size_kw IS NULL AND (NEW.data->>'systemSizeKw') IS NOT NULL THEN
      IF (NEW.data->>'systemSizeKw') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
        NEW.system_size_kw := (NEW.data->>'systemSizeKw')::numeric;
      END IF;
    END IF;
    NEW.status := COALESCE(NEW.status, NEW.data->>'status', 'Pendente');
    NEW.install_date := COALESCE(NEW.install_date, NEW.data->>'installDate', NEW.data->>'install_date');
    NEW.finance := COALESCE(NEW.finance, NEW.data->'finance');
    NEW.attachments := COALESCE(NEW.attachments, NEW.data->'attachments');
  END IF;

  NEW.data := COALESCE(NEW.data, '{}'::jsonb) || jsonb_build_object(
    'id', NEW.id,
    'clientId', NEW.client_id,
    'clientName', NEW.client_name,
    'clientPhone', NEW.client_phone,
    'city', NEW.city,
    'systemSizeKw', NEW.system_size_kw,
    'status', NEW.status,
    'installDate', NEW.install_date,
    'finance', NEW.finance,
    'attachments', NEW.attachments,
    'updatedAt', NEW.updated_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Safe Tasks XP Sync
CREATE OR REPLACE FUNCTION xp_on_task()
RETURNS trigger AS $$
DECLARE
  old_done boolean := false;
  new_done boolean := false;
  lead_id_val uuid;
BEGIN
  IF tg_op = 'DELETE' THEN
    BEGIN
      DELETE FROM public.xp_events WHERE ref_id = old.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN old;
  END IF;

  BEGIN
    old_done := COALESCE((old.data->>'done')::boolean, false);
  EXCEPTION WHEN OTHERS THEN
    old_done := false;
  END;

  BEGIN
    new_done := COALESCE((new.data->>'done')::boolean, false);
  EXCEPTION WHEN OTHERS THEN
    new_done := false;
  END;
  
  BEGIN
    IF (new.data->>'lead_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      lead_id_val := (new.data->>'lead_id')::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    lead_id_val := NULL;
  END;

  BEGIN
    IF new_done AND NOT old_done AND lead_id_val IS NOT NULL THEN
      PERFORM public.award_xp(new.user_id, 'tarefa', 5, new.id, lead_id_val);
    ELSIF old_done AND NOT new_done THEN
      DELETE FROM public.xp_events WHERE ref_id = new.id AND kind = 'tarefa';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 7. Public Storage Access Policy for Public Buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Public read for portal, tickets and attachments' AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Public read for portal, tickets and attachments" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = ANY (ARRAY['client_portal_docs'::text, 'support_tickets'::text, 'maintenance_photos'::text, 'attachments'::text]));
  END IF;
END $$;

-- 8. Backfill and Defaults for Proposals
UPDATE public.proposals
SET user_id = '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid
WHERE user_id IS NULL;

UPDATE public.proposals
SET created_by = '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid
WHERE created_by IS NULL;

ALTER TABLE public.proposals
  ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid),
  ALTER COLUMN created_by SET DEFAULT COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
