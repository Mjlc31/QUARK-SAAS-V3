-- ==============================================================================
-- Migration: 20261022_crm_leads_resilience_and_rls.sql
-- Description:
--   1. Permite leitura pública de leads e clientes não deletados (previne "desaparecimento"
--      de leads e clientes quando user_id é nulo ou sessão em modo offline).
--   2. Atualiza trigger sync_lead_to_opportunity para ser à prova de falhas com IDs não-UUID.
--   3. Corrige trg_sync_leads_columns para validar que data->>'value' é numérico antes do cast.
--   4. Isola chamada net.http_post de notify_new_lead em bloco de exceção não-bloqueante.
--   5. Configura default resiliente para user_id em opportunities, leads e client_portal_users.
--   6. Backfill de user_id nulo para o usuário administrador da Quark.
-- ==============================================================================

-- 1. Políticas RLS de leitura ativa para leads e clientes
DROP POLICY IF EXISTS "leads_read_active" ON public.leads;
CREATE POLICY "leads_read_active" ON public.leads
  FOR SELECT TO public
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "client_portal_users_read_active" ON public.client_portal_users;
CREATE POLICY "client_portal_users_read_active" ON public.client_portal_users
  FOR SELECT TO public
  USING (deleted_at IS NULL);

-- 2. Trigger sync_lead_to_opportunity resiliente contra IDs não-UUID
CREATE OR REPLACE FUNCTION public.sync_lead_to_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_phone TEXT;
    v_existing_opp_id UUID;
    v_target_id UUID;
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Se o lead já tem ID correspondente em opportunities, não insere duplicata!
    IF EXISTS (SELECT 1 FROM public.opportunities WHERE id::text = NEW.id::text) THEN
        RETURN NEW;
    END IF;

    v_phone := NEW.data->>'phone';
    
    v_user_id := COALESCE(
        NEW.user_id,
        (SELECT id FROM public.profiles WHERE role ILIKE '%admin%' ORDER BY created_at ASC LIMIT 1),
        (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1)
    );

    IF v_phone IS NOT NULL AND trim(v_phone) <> '' THEN
        SELECT id INTO v_existing_opp_id
        FROM public.opportunities
        WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
        AND (v_user_id IS NULL OR user_id = v_user_id)
        LIMIT 1;
    END IF;

    IF v_existing_opp_id IS NOT NULL THEN
        UPDATE public.opportunities
        SET
            title = COALESCE(NEW.data->>'name', NEW.name, title),
            city = COALESCE(NEW.data->>'city', NEW.city, city),
            amount = COALESCE((CASE WHEN (NEW.data->>'value') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (NEW.data->>'value')::NUMERIC ELSE NULL END), NEW.value, amount),
            updated_at = NOW()
        WHERE id = v_existing_opp_id;
    ELSE
        -- Só cria nova oportunidade se houver ao menos um nome ou título válido diferente de vazio
        IF COALESCE(NEW.data->>'name', NEW.name) IS NOT NULL AND trim(COALESCE(NEW.data->>'name', NEW.name)) <> '' THEN
            IF NEW.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                v_target_id := NEW.id::uuid;
            ELSE
                v_target_id := gen_random_uuid();
            END IF;

            INSERT INTO public.opportunities (
                id,
                title,
                phone,
                city,
                status,
                amount,
                user_id,
                created_at
            )
            VALUES (
                v_target_id,
                COALESCE(NEW.data->>'name', NEW.name),
                v_phone,
                COALESCE(NEW.data->>'city', NEW.city),
                CASE 
                    WHEN COALESCE(NEW.data->>'status', NEW.status) ILIKE '%Novo%' THEN 'Lead'
                    WHEN COALESCE(NEW.data->>'status', NEW.status) ILIKE '%Atendimento%' THEN 'Qualificado'
                    WHEN COALESCE(NEW.data->>'status', NEW.status) ILIKE '%Proposta%' THEN 'Proposta'
                    WHEN COALESCE(NEW.data->>'status', NEW.status) ILIKE '%Ganho%' OR COALESCE(NEW.data->>'status', NEW.status) ILIKE '%Fechado%' THEN 'Ganho'
                    WHEN COALESCE(NEW.data->>'status', NEW.status) ILIKE '%Perdido%' THEN 'Perdido'
                    ELSE 'Lead'
                END,
                COALESCE((CASE WHEN (NEW.data->>'value') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (NEW.data->>'value')::NUMERIC ELSE NULL END), NEW.value, 0),
                v_user_id,
                COALESCE((NEW.data->>'createdAt')::TIMESTAMPTZ, NEW.created_at, NOW())
            )
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                phone = COALESCE(EXCLUDED.phone, opportunities.phone),
                city = COALESCE(EXCLUDED.city, opportunities.city),
                amount = EXCLUDED.amount,
                updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Sanitização numérica em trg_sync_leads_columns
CREATE OR REPLACE FUNCTION public.trg_sync_leads_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.data IS NOT NULL THEN
    NEW.name := COALESCE(NEW.name, NEW.data->>'name', NEW.data->>'title');
    NEW.phone := COALESCE(NEW.phone, NEW.data->>'phone');
    NEW.email := COALESCE(NEW.email, NEW.data->>'email');
    NEW.city := COALESCE(NEW.city, NEW.data->>'city');
    NEW.status := COALESCE(NEW.status, NEW.data->>'status');
    IF NEW.value IS NULL AND (NEW.data->>'value') IS NOT NULL AND (NEW.data->>'value') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
      NEW.value := (NEW.data->>'value')::numeric;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Tratamento defensivo em notify_new_lead (não trava insert se o n8n ou rede falhar)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://n8n-production-61961.up.railway.app/webhook/novo-lead-crm',
      body := row_to_json(NEW)::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Falha ao despachar webhook n8n: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 5. Defaults de user_id resilientes com fallback para admin
ALTER TABLE public.opportunities 
  ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);

ALTER TABLE public.leads 
  ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);

ALTER TABLE public.client_portal_users 
  ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);

-- 6. Backfill
UPDATE public.opportunities 
SET user_id = '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid 
WHERE user_id IS NULL;

UPDATE public.leads 
SET user_id = '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid 
WHERE user_id IS NULL;

UPDATE public.client_portal_users 
SET user_id = '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid 
WHERE user_id IS NULL;
