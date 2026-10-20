-- =========================================================================
-- MIGRATION: 20261020_enable_team_sharing_and_partner_access.sql
-- DESCRIÇÃO: Concede acesso compartilhado a dados operacionais (Leads, CRM,
--            Propostas, Finanças, Tarefas, Projetos, etc.) para todos os
--            membros da equipe interna (Arthur Moraes, Anderson Alves, etc.).
-- =========================================================================

-- 1. Funções Auxiliares de Membro da Equipe e Administrador
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid())
      AND (role = 'Admin' OR email IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com'))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_team_member() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- 2. Atualizar perfis dos sócios para Admin
UPDATE public.profiles
SET role = 'Admin', name = 'Arthur Moraes', avatar_initials = 'AM', updated_at = now()
WHERE id = '7dacc88f-9ebd-4710-a1be-0647841db24a';

UPDATE public.profiles
SET role = 'Admin', name = 'Anderson Alves', avatar_initials = 'AA', updated_at = now()
WHERE id = 'e80a490d-1f62-4282-9d66-b9034c0d823c';

-- 3. Políticas de Acesso Compartilhado da Equipe (Tabelas Operacionais)
CREATE POLICY "opportunities_team_access" ON public.opportunities
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "proposals_team_access" ON public.proposals
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "proposal_versions_team_access" ON public.proposal_versions
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "proposal_views_team_access" ON public.proposal_views
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "financial_transactions_team_access" ON public.financial_transactions
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "leads_team_access" ON public.leads
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "lead_pipelines_team_access" ON public.lead_pipelines
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "lead_tags_team_access" ON public.lead_tags
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "tasks_team_access" ON public.tasks
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "opportunity_tasks_team_access" ON public.opportunity_tasks
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "projects_team_access" ON public.projects
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "project_tracking_team_access" ON public.project_tracking
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "maintenance_services_team_access" ON public.maintenance_services
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "maintenance_alerts_team_access" ON public.maintenance_alerts
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "support_tickets_team_access" ON public.support_tickets
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "ticket_messages_team_access" ON public.ticket_messages
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "activities_team_access" ON public.activities
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "agent_notes_team_access" ON public.agent_notes
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "utility_invoices_team_access" ON public.utility_invoices
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "ecommerce_products_team_access" ON public.ecommerce_products
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "products_team_access" ON public.products
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "pipelines_team_access" ON public.pipelines
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "tags_team_access" ON public.tags
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "whatsapp_messages_team_access" ON public.whatsapp_messages
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "evolution_messages_team_access" ON public.evolution_messages
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "tool_documents_team_access" ON public.tool_documents
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "notifications_team_access" ON public.notifications
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "accounts_team_access" ON public.accounts
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "contacts_team_access" ON public.contacts
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "documents_team_access" ON public.documents
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "document_signers_team_access" ON public.document_signers
    FOR ALL TO authenticated
    USING (public.is_team_member())
    WITH CHECK (public.is_team_member());

CREATE POLICY "profiles_team_select" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);
