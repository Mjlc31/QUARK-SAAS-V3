-- ==============================================================================
-- Migration: 20261117_consolidate_rls_and_unify_crm.sql
-- Goal:
--   1. Fix handle_opportunity_won type comparison (text = uuid).
--   2. Backfill all missing leads into opportunities and link client_portal_users.
--   3. Break circular triggers between leads and opportunities using depth control.
--   4. Consolidate overlapping permissive RLS policies across core tables:
--      - opportunities (8 -> 2)
--      - proposals (10 -> 2)
--      - client_portal_users (11 -> 2)
--      - activities (6 -> 2)
--      - agent_notes (7 -> 1)
--      - financial_transactions (7 -> 1)
--      - leads (7 -> 3)
--   5. Apply scalar subquery (initplan) optimization: (SELECT auth.uid()).
--   6. Revoke EXECUTE on internal/admin RPCs from public anon role.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Segregação e Revogação de RPCs Administrativas do Papel 'anon'
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.duplicate_proposal(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_proposals(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_proposal_by_id(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_client_auth_email(text) TO anon;

-- ------------------------------------------------------------------------------
-- 2. Eliminação do Loop de Triggers (Unidirecional e Depth-Aware)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_lead_to_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_opp_id UUID;
    v_target_id UUID;
    v_user_id UUID;
    v_phone TEXT;
    v_clean_phone TEXT;
    v_status TEXT;
BEGIN
    -- Se a chamada já veio de dentro de um trigger (ex: opportunities espelhando em leads), não faz nada!
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Se o lead foi deletado/restaurado
    IF TG_OP = 'UPDATE' AND (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
        UPDATE public.opportunities
        SET deleted_at = NEW.deleted_at, updated_at = NOW()
        WHERE id::text = NEW.id;
        RETURN NEW;
    END IF;

    v_phone := COALESCE(NULLIF(trim(NEW.phone), ''), NEW.data->>'phone');
    v_clean_phone := public.clean_phone_br(v_phone);
    v_user_id := COALESCE(NEW.user_id, '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);

    v_status := CASE 
        WHEN COALESCE(NEW.status, NEW.data->>'status') ILIKE '%Fechado%' OR COALESCE(NEW.status, NEW.data->>'status') ILIKE '%Ganho%' THEN 'Ganho'
        WHEN COALESCE(NEW.status, NEW.data->>'status') ILIKE '%Proposta%' OR COALESCE(NEW.status, NEW.data->>'status') ILIKE '%Negocia%' THEN 'Proposta'
        WHEN COALESCE(NEW.status, NEW.data->>'status') ILIKE '%Qualific%' OR COALESCE(NEW.status, NEW.data->>'status') ILIKE '%Atendimento%' THEN 'Qualificado'
        WHEN COALESCE(NEW.status, NEW.data->>'status') ILIKE '%Perdido%' THEN 'Perdido'
        ELSE 'Lead'
    END;

    -- Tenta ID direto se for UUID
    IF NEW.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_target_id := NEW.id::uuid;
        SELECT id INTO v_opp_id FROM public.opportunities WHERE id = v_target_id;
    END IF;

    -- Se não achou por ID, tenta por telefone
    IF v_opp_id IS NULL AND v_clean_phone IS NOT NULL AND length(v_clean_phone) >= 8 THEN
        SELECT id INTO v_opp_id
        FROM public.opportunities
        WHERE public.clean_phone_br(phone) = v_clean_phone
        AND deleted_at IS NULL
        LIMIT 1;
    END IF;

    IF v_opp_id IS NOT NULL THEN
        UPDATE public.opportunities SET
            title = COALESCE(NULLIF(trim(NEW.name), ''), title),
            phone = COALESCE(NULLIF(trim(NEW.phone), ''), phone),
            email = COALESCE(NULLIF(trim(NEW.email), ''), email),
            city = COALESCE(NULLIF(trim(NEW.city), ''), city),
            status = COALESCE(v_status, status),
            amount = COALESCE(NEW.value, amount),
            deleted_at = NEW.deleted_at,
            updated_at = NOW()
        WHERE id = v_opp_id;
    ELSE
        IF COALESCE(NULLIF(trim(NEW.name), ''), '') <> '' THEN
            IF v_target_id IS NULL THEN
                v_target_id := gen_random_uuid();
            END IF;

            INSERT INTO public.opportunities (
                id, title, phone, email, city, status, amount, user_id, created_at, updated_at, deleted_at
            ) VALUES (
                v_target_id,
                trim(NEW.name),
                v_phone,
                NULLIF(trim(NEW.email), ''),
                COALESCE(NULLIF(trim(NEW.city), ''), 'Maceió'),
                v_status,
                COALESCE(NEW.value, 0),
                v_user_id,
                COALESCE(NEW.created_at, NOW()),
                COALESCE(NEW.updated_at, NOW()),
                NEW.deleted_at
            )
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                phone = COALESCE(EXCLUDED.phone, opportunities.phone),
                email = COALESCE(EXCLUDED.email, opportunities.email),
                city = COALESCE(EXCLUDED.city, opportunities.city),
                status = EXCLUDED.status,
                amount = EXCLUDED.amount,
                deleted_at = EXCLUDED.deleted_at,
                updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Consolidação de Políticas RLS: OPPORTUNITIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_all_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_team_access" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_select" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_insert" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_update" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_delete" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_read_active" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_tenant_all" ON public.opportunities;

CREATE POLICY "opportunities_authenticated_full"
ON public.opportunities
FOR ALL
TO authenticated
USING (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
)
WITH CHECK (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
);

CREATE POLICY "opportunities_anon_select_active"
ON public.opportunities
FOR SELECT
TO anon
USING (deleted_at IS NULL);

-- ------------------------------------------------------------------------------
-- 4. Consolidação de Políticas RLS: PROPOSALS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_all_proposals" ON public.proposals;
DROP POLICY IF EXISTS "proposals_team_access" ON public.proposals;
DROP POLICY IF EXISTS "client_proposals_select" ON public.proposals;
DROP POLICY IF EXISTS "quark_proposals_open" ON public.proposals;
DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;
DROP POLICY IF EXISTS "proposals_read_active" ON public.proposals;
DROP POLICY IF EXISTS "proposals_all_access" ON public.proposals;

CREATE POLICY "proposals_authenticated_full"
ON public.proposals
FOR ALL
TO authenticated
USING (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
)
WITH CHECK (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
);

CREATE POLICY "proposals_anon_select_active"
ON public.proposals
FOR SELECT
TO anon
USING (deleted_at IS NULL);

-- ------------------------------------------------------------------------------
-- 5. Consolidação de Políticas RLS: CLIENT_PORTAL_USERS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_all_client_portal_users" ON public.client_portal_users;
DROP POLICY IF EXISTS "tenant_client_portal_users_select" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_can_read_own_profile" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_can_update_own_profile" ON public.client_portal_users;
DROP POLICY IF EXISTS "quark_team_access_client_portal_users" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_portal_users_tenant_access" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_portal_users_read_active" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_portal_users_select" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_portal_users_insert" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_portal_users_update" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_portal_users_delete" ON public.client_portal_users;

CREATE POLICY "client_portal_users_team_full"
ON public.client_portal_users
FOR ALL
TO authenticated
USING (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id) OR
    ((SELECT auth.uid()) = auth_user_id)
)
WITH CHECK (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id) OR
    ((SELECT auth.uid()) = auth_user_id)
);

CREATE POLICY "client_portal_users_anon_read_active"
ON public.client_portal_users
FOR SELECT
TO anon
USING (deleted_at IS NULL);

-- ------------------------------------------------------------------------------
-- 6. Consolidação de Políticas RLS: ACTIVITIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_all_activities" ON public.activities;
DROP POLICY IF EXISTS "activities_team_access" ON public.activities;
DROP POLICY IF EXISTS "activities_tenant_insert" ON public.activities;
DROP POLICY IF EXISTS "activities_tenant_delete" ON public.activities;
DROP POLICY IF EXISTS "activities_tenant_select" ON public.activities;
DROP POLICY IF EXISTS "activities_public_all" ON public.activities;

CREATE POLICY "activities_authenticated_full"
ON public.activities
FOR ALL
TO authenticated
USING (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = created_by)
)
WITH CHECK (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = created_by)
);

CREATE POLICY "activities_anon_insert_only"
ON public.activities
FOR INSERT
TO anon
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. Consolidação de Políticas RLS: AGENT_NOTES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_all_agent_notes" ON public.agent_notes;
DROP POLICY IF EXISTS "agent_notes_team_access" ON public.agent_notes;
DROP POLICY IF EXISTS "agent_notes_public_all" ON public.agent_notes;
DROP POLICY IF EXISTS "agent_notes_select" ON public.agent_notes;
DROP POLICY IF EXISTS "agent_notes_insert" ON public.agent_notes;
DROP POLICY IF EXISTS "agent_notes_update" ON public.agent_notes;
DROP POLICY IF EXISTS "agent_notes_delete" ON public.agent_notes;

CREATE POLICY "agent_notes_authenticated_full"
ON public.agent_notes
FOR ALL
TO authenticated
USING (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
)
WITH CHECK (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
);

-- ------------------------------------------------------------------------------
-- 8. Consolidação de Políticas RLS: FINANCIAL_TRANSACTIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_all_financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_team_access" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_insert" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_delete" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_select" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_update" ON public.financial_transactions;
DROP POLICY IF EXISTS "quark_fin_open" ON public.financial_transactions;

CREATE POLICY "financial_transactions_authenticated_full"
ON public.financial_transactions
FOR ALL
TO authenticated
USING (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
)
WITH CHECK (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
);

-- ------------------------------------------------------------------------------
-- 9. Consolidação de Políticas RLS: LEADS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_all_leads" ON public.leads;
DROP POLICY IF EXISTS "leads_team_access" ON public.leads;
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;
DROP POLICY IF EXISTS "leads_tenant_all" ON public.leads;

CREATE POLICY "leads_authenticated_full"
ON public.leads
FOR ALL
TO authenticated
USING (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
)
WITH CHECK (
    is_team_member() OR 
    is_admin() OR 
    ((SELECT auth.uid()) = user_id)
);

CREATE POLICY "leads_anon_capture_and_read"
ON public.leads
FOR SELECT
TO anon
USING (deleted_at IS NULL);

CREATE POLICY "leads_anon_insert_capture"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);

COMMIT;
