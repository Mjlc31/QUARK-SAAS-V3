-- =========================================================================
-- QUARK SAAS V3 - DATABASE ARCHITECTURE & DESIGN OPTIMIZATION
-- Migration: 20261019_database_architecture_optimization
-- Authors: Database Architect & Fullstack Auditor (/database-architect & /database-design)
-- =========================================================================

-- =========================================================================
-- 1. TABELAS E COLUNAS FALTANTES
-- =========================================================================

-- 1.1 Tabela de conexões do Evolution WhatsApp API (necessária para whatsapp-backend/evolution_webhook.js)
CREATE TABLE IF NOT EXISTS public.evolution_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance TEXT UNIQUE NOT NULL,
    state TEXT,
    status_reason TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.evolution_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evolution_connections_auth" ON public.evolution_connections;
CREATE POLICY "evolution_connections_auth" ON public.evolution_connections
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id OR user_id IS NULL)
    WITH CHECK ((SELECT auth.uid()) = user_id OR user_id IS NULL);

GRANT ALL ON public.evolution_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolution_connections TO authenticated;

-- 1.2 Colunas faltantes em financial_transactions
-- Elimina a gambiarra de concatenar URL de comprovante no campo `note` e adiciona status/método
ALTER TABLE public.financial_transactions 
    ADD COLUMN IF NOT EXISTS attachment_url TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pago',
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS proposal_id TEXT REFERENCES public.proposals(id) ON DELETE SET NULL;

-- 1.3 Colunas faltantes em proposals
ALTER TABLE public.proposals
    ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- 1.4 Colunas faltantes em whatsapp_messages
ALTER TABLE public.whatsapp_messages
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';


-- =========================================================================
-- 2. ÍNDICES DE PERFORMANCE E CHAVES ESTRANGEIRAS NÃO INDEXADAS
-- =========================================================================

-- 2.1 Foreign Keys que estavam causando sequential scans e locks de cascata
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON public.activities(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity_id ON public.activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_tasks_opportunity_id ON public.opportunity_tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_tasks_user_id ON public.opportunity_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_user_id ON public.pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_documents_user_id ON public.tool_documents(user_id);

-- 2.2 Índices compostos para consultas de alta frequência
CREATE INDEX IF NOT EXISTS idx_wpp_chat_timestamp ON public.whatsapp_messages(chat_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wpp_user_chat ON public.whatsapp_messages(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_fin_user_date ON public.financial_transactions(user_id, date DESC) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_fin_opportunity_id ON public.financial_transactions(opportunity_id) WHERE (opportunity_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_proposals_opportunity_id ON public.proposals(opportunity_id) WHERE (opportunity_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_opportunity_id ON public.documents(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_document_signers_token ON public.document_signers(token);
CREATE INDEX IF NOT EXISTS idx_document_signers_doc ON public.document_signers(document_id);
CREATE INDEX IF NOT EXISTS idx_evolution_connections_instance ON public.evolution_connections(instance);
CREATE INDEX IF NOT EXISTS idx_evolution_connections_user_id ON public.evolution_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_proposal_id ON public.financial_transactions(proposal_id);


-- =========================================================================
-- 3. REMOÇÃO DE POLÍTICAS VAZADAS / BYPASS DE RLS (SEGURANÇA MULTI-TENANT)
-- =========================================================================

-- Remove políticas perigosas com cmd ALL / SELECT e qual 'true' aberto para 'public'
DROP POLICY IF EXISTS "quark_fin_open" ON public.financial_transactions;
DROP POLICY IF EXISTS "quark_proposals_open" ON public.proposals;
DROP POLICY IF EXISTS "accounts_all" ON public.accounts;
DROP POLICY IF EXISTS "contacts_all" ON public.contacts;
DROP POLICY IF EXISTS "accounts_select" ON public.accounts;
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "quark_landing_open" ON public.landing_page_leads;
DROP POLICY IF EXISTS "quark_lp_open" ON public.lead_pipelines;
DROP POLICY IF EXISTS "quark_lt_open" ON public.lead_tags;

-- Políticas seguras para accounts e contacts
CREATE POLICY "accounts_authenticated_all" ON public.accounts
    FOR ALL TO authenticated
    USING (((SELECT auth.uid()) = user_id) OR user_id IS NULL)
    WITH CHECK (((SELECT auth.uid()) = user_id) OR user_id IS NULL);

CREATE POLICY "contacts_authenticated_all" ON public.contacts
    FOR ALL TO authenticated
    USING (((SELECT auth.uid()) = user_id) OR user_id IS NULL)
    WITH CHECK (((SELECT auth.uid()) = user_id) OR user_id IS NULL);


-- =========================================================================
-- 4. OTIMIZAÇÃO INITPLAN DE POLÍTICAS RLS (SUBQUERY auth.uid())
-- Substitui auth.uid() por (SELECT auth.uid()) para executar 1 única vez por query
-- =========================================================================

-- 4.1 financial_transactions
DROP POLICY IF EXISTS "financial_transactions_select" ON public.financial_transactions;
CREATE POLICY "financial_transactions_select" ON public.financial_transactions
    FOR SELECT TO authenticated
    USING (((SELECT auth.uid()) = user_id) AND (deleted_at IS NULL));

DROP POLICY IF EXISTS "financial_transactions_insert" ON public.financial_transactions;
CREATE POLICY "financial_transactions_insert" ON public.financial_transactions
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "financial_transactions_update" ON public.financial_transactions;
CREATE POLICY "financial_transactions_update" ON public.financial_transactions
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "financial_transactions_delete" ON public.financial_transactions;
CREATE POLICY "financial_transactions_delete" ON public.financial_transactions
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 4.2 opportunities
DROP POLICY IF EXISTS "opportunities_select" ON public.opportunities;
CREATE POLICY "opportunities_select" ON public.opportunities
    FOR SELECT TO authenticated
    USING (((SELECT auth.uid()) = user_id) AND (deleted_at IS NULL));

DROP POLICY IF EXISTS "opportunities_insert" ON public.opportunities;
CREATE POLICY "opportunities_insert" ON public.opportunities
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "opportunities_update" ON public.opportunities;
CREATE POLICY "opportunities_update" ON public.opportunities
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "opportunities_delete" ON public.opportunities;
CREATE POLICY "opportunities_delete" ON public.opportunities
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "opportunities_tenant_all" ON public.opportunities;

-- 4.3 proposals
DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
CREATE POLICY "proposals_select" ON public.proposals
    FOR SELECT TO authenticated
    USING (((SELECT auth.uid()) = user_id) AND (deleted_at IS NULL));

DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
CREATE POLICY "proposals_insert" ON public.proposals
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "proposals_update" ON public.proposals;
CREATE POLICY "proposals_update" ON public.proposals
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;
CREATE POLICY "proposals_delete" ON public.proposals
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 4.4 whatsapp_messages
DROP POLICY IF EXISTS "wpp_tenant_select" ON public.whatsapp_messages;
CREATE POLICY "wpp_tenant_select" ON public.whatsapp_messages
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "wpp_tenant_insert" ON public.whatsapp_messages;
CREATE POLICY "wpp_tenant_insert" ON public.whatsapp_messages
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "wpp_tenant_update" ON public.whatsapp_messages;
CREATE POLICY "wpp_tenant_update" ON public.whatsapp_messages
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "wpp_tenant_delete" ON public.whatsapp_messages;
CREATE POLICY "wpp_tenant_delete" ON public.whatsapp_messages
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 4.5 leads
DROP POLICY IF EXISTS "leads_select" ON public.leads;
CREATE POLICY "leads_select" ON public.leads
    FOR SELECT TO authenticated
    USING (((SELECT auth.uid()) = user_id) AND (deleted_at IS NULL));

DROP POLICY IF EXISTS "leads_insert" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "leads_update" ON public.leads;
CREATE POLICY "leads_update" ON public.leads
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "leads_delete" ON public.leads;
CREATE POLICY "leads_delete" ON public.leads
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "leads_tenant_all" ON public.leads;


-- =========================================================================
-- 5. BLINDAGEM DE FUNÇÕES CONTRA ATAQUES DE SEARCH_PATH MUTÁVEL
-- =========================================================================

ALTER FUNCTION public.accept_public_proposal(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_cpf_exists(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_crm_lead(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_tenant_policy(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_client_profile_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_financial_dre_summary(uuid, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_document(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_proposal(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.inherit_tenant_for_ticket() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_member() SET search_path = public, pg_temp;
ALTER FUNCTION public.link_client_portal_user(uuid, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_opportunity_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_new_lead() SET search_path = public, pg_temp;
ALTER FUNCTION public.ping_proposal_view(text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.register_proposal_view(text, text, text, text, text, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.sign_public_document(text, text, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_products_jsonb() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_tasks_jsonb() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_modified_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.view_public_document(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.xp_on_proposal() SET search_path = public, pg_temp;


-- =========================================================================
-- 6. REMOÇÃO DE UUIDS HARDCODED E CORREÇÃO DE TRIGGERS
-- =========================================================================

-- 6.1 Sincronização inteligente de leads -> opportunities
CREATE OR REPLACE FUNCTION public.sync_lead_to_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_user_id UUID;
    v_phone TEXT;
    v_existing_opp_id UUID;
BEGIN
    v_phone := NEW.data->>'phone';
    
    -- Atribui dinamicamente: NEW.user_id ou Admin do sistema, sem UUID estático
    v_user_id := COALESCE(
        NEW.user_id,
        (SELECT id FROM public.profiles WHERE role ILIKE '%admin%' ORDER BY created_at ASC LIMIT 1),
        (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1)
    );

    -- Evita duplicidade se o telefone já existir para este tenant/usuário
    IF v_phone IS NOT NULL AND v_phone <> '' THEN
        SELECT id INTO v_existing_opp_id
        FROM public.opportunities
        WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
        AND (v_user_id IS NULL OR user_id = v_user_id)
        LIMIT 1;
    END IF;

    IF v_existing_opp_id IS NOT NULL THEN
        UPDATE public.opportunities
        SET
            title = COALESCE(NEW.data->>'name', title),
            city = COALESCE(NEW.data->>'city', city),
            amount = COALESCE((NEW.data->>'value')::NUMERIC, amount),
            updated_at = NOW()
        WHERE id = v_existing_opp_id;
    ELSE
        INSERT INTO public.opportunities (
            title,
            phone,
            city,
            status,
            amount,
            user_id,
            created_at
        )
        VALUES (
            COALESCE(NEW.data->>'name', 'Lead sem nome'),
            v_phone,
            NEW.data->>'city',
            CASE 
                WHEN NEW.data->>'status' ILIKE '%Novo%' THEN 'Lead'
                WHEN NEW.data->>'status' ILIKE '%Atendimento%' THEN 'Qualificado'
                WHEN NEW.data->>'status' ILIKE '%Proposta%' THEN 'Proposta'
                WHEN NEW.data->>'status' ILIKE '%Ganho%' OR NEW.data->>'status' ILIKE '%Fechado%' THEN 'Ganho'
                WHEN NEW.data->>'status' ILIKE '%Perdido%' THEN 'Perdido'
                ELSE 'Lead'
            END,
            COALESCE((NEW.data->>'value')::NUMERIC, 0),
            v_user_id,
            COALESCE((NEW.data->>'createdAt')::TIMESTAMPTZ, NEW.created_at, NOW())
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- 6.2 Sincronização inteligente de landing_page_leads -> opportunities
CREATE OR REPLACE FUNCTION public.sync_landing_page_lead_to_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := COALESCE(
        (SELECT id FROM public.profiles WHERE role ILIKE '%admin%' ORDER BY created_at ASC LIMIT 1),
        (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1)
    );

    INSERT INTO public.opportunities (
        title,
        phone,
        city,
        status,
        amount,
        user_id,
        source,
        created_at
    )
    VALUES (
        COALESCE(NEW.name, 'Lead Site') || ' - Site',
        NEW.phone,
        NEW.city,
        'Lead',
        0,
        v_user_id,
        'Landing Page',
        COALESCE(NEW.created_at, NOW())
    );
    RETURN NEW;
END;
$function$;


-- =========================================================================
-- 7. RESTRIÇÃO DE EXECUÇÃO DE FUNÇÕES INTERNAS E FINANCEIRAS
-- =========================================================================

-- DRE deve ser restrito a usuários autenticados da empresa
REVOKE EXECUTE ON FUNCTION public.get_financial_dre_summary(uuid, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_financial_dre_summary(uuid, date, date) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_client_referral_user_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inherit_tenant_for_ticket() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_opportunity_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_landing_page_lead_to_opportunity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_lead_to_opportunity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.xp_on_lead() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.xp_on_proposal() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.xp_on_task() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_usage() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_tenant_policy(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_webhook_url() FROM anon;

-- =========================================================================
-- 8. CORREÇÕES DE INTEGRIDADE: ACTIVITIES FK & PROPOSALS MULTI-TENANCY RLS
-- =========================================================================

-- 8.1 Correção do trigger de mudança de status no CRM (evita violação da FK activities_lead_id_fkey)
CREATE OR REPLACE FUNCTION public.log_opportunity_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_lead_id text := NULL;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Só define lead_id se realmente existir na tabela leads legada para evitar violação de FK
        IF EXISTS (SELECT 1 FROM public.leads WHERE id = NEW.id::text) THEN
            v_lead_id := NEW.id::text;
        END IF;

        INSERT INTO public.activities (
            opportunity_id,
            lead_id,
            type,
            content,
            created_by,
            created_at
        )
        VALUES (
            NEW.id,
            v_lead_id,
            'sistema',
            'Status comercial alterado de "' || COALESCE(OLD.status, 'Novo') || '" para "' || NEW.status || '".',
            NEW.user_id,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$function$;

-- 8.2 Automação de preenchimento de defaults para proposals (user_id, created_by, opportunity_id)
CREATE OR REPLACE FUNCTION public.handle_proposal_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(NEW.created_by, auth.uid());
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := COALESCE(NEW.user_id, auth.uid());
  END IF;
  IF NEW.opportunity_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    BEGIN
      NEW.opportunity_id := NEW.lead_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  IF NEW.lead_id IS NULL AND NEW.opportunity_id IS NOT NULL THEN
    NEW.lead_id := NEW.opportunity_id::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposal_defaults ON public.proposals;
CREATE TRIGGER trg_proposal_defaults
BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.handle_proposal_defaults();

-- 8.3 Backfill de integridade para propostas existentes
UPDATE public.proposals
SET user_id = COALESCE(user_id, created_by, '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid),
    created_by = COALESCE(created_by, user_id, '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid)
WHERE user_id IS NULL OR created_by IS NULL;

UPDATE public.proposals
SET opportunity_id = lead_id::uuid
WHERE opportunity_id IS NULL AND lead_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 8.4 Ajuste das políticas de RLS em public.proposals
DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
CREATE POLICY "proposals_select" ON public.proposals
FOR SELECT TO authenticated
USING (
  (deleted_at IS NULL) AND
  (
    user_id = auth.uid() OR
    created_by = auth.uid() OR
    user_id IS NULL
  )
);

DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
CREATE POLICY "proposals_insert" ON public.proposals
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  created_by = auth.uid() OR
  user_id IS NULL
);

DROP POLICY IF EXISTS "proposals_update" ON public.proposals;
CREATE POLICY "proposals_update" ON public.proposals
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR
  created_by = auth.uid() OR
  user_id IS NULL
)
WITH CHECK (
  user_id = auth.uid() OR
  created_by = auth.uid() OR
  user_id IS NULL
);

DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;
CREATE POLICY "proposals_delete" ON public.proposals
FOR DELETE TO authenticated
USING (
  user_id = auth.uid() OR
  created_by = auth.uid() OR
  user_id IS NULL
);

DROP POLICY IF EXISTS "quark_proposals_open" ON public.proposals;

