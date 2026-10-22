-- =========================================================================
-- QUARK OS - DATABASE ARCHITECT & DATA RESILIENCE AUDIT
-- Date: 2026-10-21
-- Target: sumydaewtszecrvdgoku (QUARK SAAS V3)
-- =========================================================================

-- 1. Constraints & Column Defaults
ALTER TABLE public.client_portal_users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.client_portal_users ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.leads ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.products ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.project_tracking ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.projects ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.proposals ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.client_intelligence ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.utility_invoices ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.financial_transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.agent_notes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.activities ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.whatsapp_messages ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Client Portal Users Sanitization Trigger
CREATE OR REPLACE FUNCTION public.trg_sanitize_client_portal_users()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND trim(NEW.email) = '' THEN
    NEW.email := NULL;
  END IF;

  IF NEW.cpf IS NOT NULL AND trim(NEW.cpf) = '' THEN
    NEW.cpf := NULL;
  END IF;

  IF NEW.phone IS NOT NULL AND trim(NEW.phone) = '' THEN
    NEW.phone := NULL;
  END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_client_portal_users_sanitize
  BEFORE INSERT OR UPDATE ON public.client_portal_users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sanitize_client_portal_users();

-- 3. Automatic Conversion from Won Opportunity to Client
CREATE OR REPLACE FUNCTION public.trg_opportunity_convert_to_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
  v_phone text := NULLIF(trim(NEW.phone), '');
  v_email text := NULLIF(trim(NEW.email), '');
  v_cpf text := NULLIF(trim(NEW.cpf_cnpj), '');
  v_clean_phone text;
  v_clean_cpf text;
BEGIN
  IF NEW.status = 'Ganho' AND (OLD.status IS DISTINCT FROM 'Ganho') THEN
    v_clean_phone := regexp_replace(COALESCE(v_phone, ''), '[^0-9]', '', 'g');
    v_clean_cpf := regexp_replace(COALESCE(v_cpf, ''), '[^0-9]', '', 'g');

    SELECT id INTO v_client_id
    FROM public.client_portal_users
    WHERE (opportunity_id = NEW.id)
       OR (v_clean_cpf <> '' AND regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = v_clean_cpf)
       OR (v_clean_phone <> '' AND length(v_clean_phone) >= 8 AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_clean_phone)
       OR (v_email IS NOT NULL AND lower(email) = lower(v_email))
       OR (lower(trim(name)) = lower(trim(NEW.title)))
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
      UPDATE public.client_portal_users
      SET
        opportunity_id = COALESCE(opportunity_id, NEW.id),
        user_id = COALESCE(user_id, NEW.user_id),
        system_size_kw = COALESCE(system_size_kw, NEW.system_power),
        city = COALESCE(city, NEW.city),
        phone = COALESCE(phone, v_phone),
        email = COALESCE(email, v_email),
        cpf = COALESCE(cpf, v_cpf),
        updated_at = NOW()
      WHERE id = v_client_id;
    ELSE
      INSERT INTO public.client_portal_users (
        name,
        email,
        phone,
        cpf,
        city,
        system_size_kw,
        user_id,
        opportunity_id,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        NEW.title,
        v_email,
        v_phone,
        v_cpf,
        NEW.city,
        NEW.system_power,
        COALESCE(NEW.user_id, '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid),
        NEW.id,
        true,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_opportunity_convert_client
  AFTER INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_opportunity_convert_to_client();

-- 4. Bidirectional Sync from Opportunities to Leads (with normalized columns)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS value numeric;

CREATE OR REPLACE FUNCTION public.sync_opportunity_to_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.leads (id, user_id, name, phone, email, city, status, value, data, created_at, updated_at)
    VALUES (
        NEW.id::text,
        NEW.user_id,
        NEW.title,
        NEW.phone,
        NEW.email,
        NEW.city,
        NEW.status,
        NEW.amount,
        jsonb_build_object(
            'id', NEW.id::text,
            'name', NEW.title,
            'phone', NEW.phone,
            'city', NEW.city,
            'email', NEW.email,
            'cpf_cnpj', NEW.cpf_cnpj,
            'status', NEW.status,
            'value', NEW.amount,
            'createdAt', NEW.created_at,
            'updatedAt', NEW.updated_at
        ),
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        city = EXCLUDED.city,
        status = EXCLUDED.status,
        value = EXCLUDED.value,
        data = public.leads.data || jsonb_build_object(
            'name', NEW.title,
            'phone', NEW.phone,
            'city', NEW.city,
            'email', NEW.email,
            'cpf_cnpj', NEW.cpf_cnpj,
            'status', NEW.status,
            'value', NEW.amount,
            'updatedAt', NEW.updated_at
        ),
        updated_at = NEW.updated_at;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_sync_opportunity_to_lead
  AFTER INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_opportunity_to_lead();

-- Trigger for direct leads insertion
CREATE OR REPLACE FUNCTION public.trg_sync_leads_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.data IS NOT NULL THEN
    NEW.name := COALESCE(NEW.name, NEW.data->>'name', NEW.data->>'title');
    NEW.phone := COALESCE(NEW.phone, NEW.data->>'phone');
    NEW.email := COALESCE(NEW.email, NEW.data->>'email');
    NEW.city := COALESCE(NEW.city, NEW.data->>'city');
    NEW.status := COALESCE(NEW.status, NEW.data->>'status');
    IF NEW.value IS NULL AND (NEW.data->>'value') IS NOT NULL THEN
      NEW.value := (NEW.data->>'value')::numeric;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_sync_leads_columns_trigger
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_leads_columns();

-- 5. Atomic Proposal Duplication RPC
CREATE OR REPLACE FUNCTION public.duplicate_proposal(
  p_proposal_id text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source proposals%ROWTYPE;
  v_new_id text := gen_random_uuid()::text;
  v_new_number int;
  v_user_id uuid;
  v_opp_id uuid;
BEGIN
  SELECT * INTO v_source FROM public.proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta % não encontrada', p_proposal_id;
  END IF;

  v_user_id := COALESCE(p_user_id, auth.uid(), v_source.user_id, '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);

  v_opp_id := NULL;
  IF v_source.opportunity_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.opportunities WHERE id = v_source.opportunity_id) THEN
      v_opp_id := v_source.opportunity_id;
    END IF;
  ELSIF v_source.lead_id IS NOT NULL AND length(v_source.lead_id) = 36 THEN
    BEGIN
      IF EXISTS (SELECT 1 FROM public.opportunities WHERE id = v_source.lead_id::uuid) THEN
        v_opp_id := v_source.lead_id::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_opp_id := NULL;
    END;
  END IF;

  INSERT INTO public.proposals (
    id, lead_id, opportunity_id, user_id, title, status, inputs, blocks, theme, data,
    power_kwp, monthly_generation, direct_cost, commission_value, tax_value, profit_value,
    final_price, created_by, client_name, city, phone, email, cpf_cnpj, address, state,
    roof_type, system_size_kw, installation_cost, version
  ) VALUES (
    v_new_id, v_source.lead_id, v_opp_id, v_user_id, COALESCE(v_source.title || ' (cópia)', 'Cópia'),
    'rascunho', v_source.inputs, v_source.blocks, v_source.theme, v_source.data,
    v_source.power_kwp, v_source.monthly_generation, v_source.direct_cost, v_source.commission_value,
    v_source.tax_value, v_source.profit_value, v_source.final_price, v_user_id,
    v_source.client_name, v_source.city, v_source.phone, v_source.email, v_source.cpf_cnpj,
    v_source.address, v_source.state, v_source.roof_type, v_source.system_size_kw,
    v_source.installation_cost, 1
  )
  RETURNING number INTO v_new_number;

  IF v_opp_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.activities (opportunity_id, type, content, created_by)
      VALUES (v_opp_id, 'proposta', format('Orçamento #%s criado a partir do #%s', v_new_number, v_source.number), v_user_id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object('id', v_new_id, 'number', v_new_number);
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_proposal(text, uuid) TO authenticated, anon;

-- 6. Receipts Table & Sequence
CREATE SEQUENCE IF NOT EXISTS public.receipts_number_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.receipts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number integer NOT NULL DEFAULT nextval('public.receipts_number_seq'::regclass),
  payer_name text NOT NULL,
  payer_doc text,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  method text DEFAULT 'PIX',
  installment text,
  paid_at text DEFAULT CURRENT_DATE::text,
  city text DEFAULT 'Maceió/AL',
  lead_id text REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'receipts' AND policyname = 'quark_receipts_auth'
  ) THEN
    CREATE POLICY quark_receipts_auth ON public.receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'receipts' AND policyname = 'receipts_anon_read'
  ) THEN
    CREATE POLICY receipts_anon_read ON public.receipts FOR SELECT TO anon USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_lead_id ON public.receipts(lead_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_active ON public.receipts(created_at DESC) WHERE (deleted_at IS NULL);

-- 7. Documents & Signers Fix
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
ALTER TABLE public.document_signers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.document_signers ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;
ALTER TABLE public.document_signers ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(16), 'hex');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'quark_documents_auth'
  ) THEN
    CREATE POLICY quark_documents_auth ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_signers' AND policyname = 'quark_document_signers_auth'
  ) THEN
    CREATE POLICY quark_document_signers_auth ON public.document_signers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. Support Tickets & Ticket Messages Fix
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.support_tickets ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.trg_sanitize_support_tickets()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.client_portal_users WHERE id = NEW.client_id) THEN
      NEW.client_id := NULL;
    END IF;
  END IF;

  IF NEW.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_support_tickets_sanitize
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sanitize_support_tickets();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_tickets' AND policyname = 'quark_support_tickets_auth'
  ) THEN
    CREATE POLICY quark_support_tickets_auth ON public.support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ticket_messages' AND policyname = 'quark_ticket_messages_auth'
  ) THEN
    CREATE POLICY quark_ticket_messages_auth ON public.ticket_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. Maintenance Services & Alerts Fix
ALTER TABLE public.maintenance_services ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.maintenance_services ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.maintenance_alerts ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.trg_sanitize_maintenance_services()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.client_portal_users WHERE id = NEW.client_id) THEN
      NEW.client_id := NULL;
    END IF;
  END IF;

  IF NEW.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_maintenance_services_sanitize
  BEFORE INSERT OR UPDATE ON public.maintenance_services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sanitize_maintenance_services();

CREATE OR REPLACE FUNCTION public.trg_sanitize_maintenance_alerts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_maintenance_alerts_sanitize
  BEFORE INSERT OR UPDATE ON public.maintenance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sanitize_maintenance_alerts();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_services' AND policyname = 'quark_maintenance_services_auth'
  ) THEN
    CREATE POLICY quark_maintenance_services_auth ON public.maintenance_services FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_alerts' AND policyname = 'quark_maintenance_alerts_auth'
  ) THEN
    CREATE POLICY quark_maintenance_alerts_auth ON public.maintenance_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 10. Normalize Projects Table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS system_size_kw numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pendente';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS install_date text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS finance jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS attachments jsonb;

CREATE OR REPLACE FUNCTION public.sync_projects_jsonb()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.data IS NOT NULL THEN
    NEW.client_id := COALESCE(NEW.client_id, NEW.data->>'clientId', NEW.data->>'client_id');
    NEW.client_name := COALESCE(NEW.client_name, NEW.data->>'clientName', NEW.data->>'client_name');
    NEW.client_phone := COALESCE(NEW.client_phone, NEW.data->>'clientPhone', NEW.data->>'client_phone');
    NEW.city := COALESCE(NEW.city, NEW.data->>'city');
    IF NEW.system_size_kw IS NULL AND (NEW.data->>'systemSizeKw') IS NOT NULL THEN
      NEW.system_size_kw := (NEW.data->>'systemSizeKw')::numeric;
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
$$;

CREATE OR REPLACE TRIGGER trg_sync_projects_jsonb
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_projects_jsonb();

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_city ON public.projects(city);
CREATE INDEX IF NOT EXISTS idx_projects_client_name ON public.projects(client_name);

-- 11. Financial Transactions ID Flexibility
ALTER TABLE public.financial_transactions ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.financial_transactions ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
