-- ============================================================
-- 20260820_indexes_views_rls.sql
-- Performance Indexes, Materialized View, Granular RLS, Constraints
-- ============================================================

-- 1. B-Tree Indexes on user_id and lead_id
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_user_id ON public.pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipelines_user_id ON public.lead_pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_user_id ON public.lead_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_id ON public.financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_lead_pipelines_lead_id ON public.lead_pipelines(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON public.lead_tags(lead_id);

-- 2. Materialized View for Financial Dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_financial_summary AS
SELECT user_id, date_trunc('month', date) as month, category, type, 
       SUM(amount) as total, COUNT(*) as count
FROM public.financial_transactions
GROUP BY user_id, date_trunc('month', date), category, type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_financial_summary_unique 
ON mv_monthly_financial_summary (user_id, month, category, type);

-- 3. Granular RLS Policies (SELECT, INSERT, UPDATE, DELETE)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public' 
          AND policyname LIKE '%Strict user isolation%'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Drop shared table policies if they have the specific name
DROP POLICY IF EXISTS "Pipelines: Strict user isolation or global" ON public.pipelines;
DROP POLICY IF EXISTS "Tags: Strict user isolation or global" ON public.tags;

-- Leads
CREATE POLICY "Leads: Select" ON public.leads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Leads: Insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leads: Update" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leads: Delete" ON public.leads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Tasks: Select" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Tasks: Insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tasks: Update" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tasks: Delete" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Projects
CREATE POLICY "Projects: Select" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Projects: Insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Projects: Update" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Projects: Delete" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Products
CREATE POLICY "Products: Select" ON public.products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Products: Insert" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Products: Update" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Products: Delete" ON public.products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lead Pipelines
CREATE POLICY "LeadPipelines: Select" ON public.lead_pipelines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "LeadPipelines: Insert" ON public.lead_pipelines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "LeadPipelines: Update" ON public.lead_pipelines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "LeadPipelines: Delete" ON public.lead_pipelines FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lead Tags
CREATE POLICY "LeadTags: Select" ON public.lead_tags FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "LeadTags: Insert" ON public.lead_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "LeadTags: Update" ON public.lead_tags FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "LeadTags: Delete" ON public.lead_tags FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Financial Transactions
CREATE POLICY "Financial: Select" ON public.financial_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Financial: Insert" ON public.financial_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Financial: Update" ON public.financial_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Financial: Delete" ON public.financial_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- WhatsApp Messages
CREATE POLICY "WhatsApp: Select" ON public.whatsapp_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "WhatsApp: Insert" ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "WhatsApp: Update" ON public.whatsapp_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "WhatsApp: Delete" ON public.whatsapp_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Shared/Seeded Tables (Allow if user_id matches OR user_id is NULL for global presets)
CREATE POLICY "Pipelines: Select" ON public.pipelines FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Pipelines: Insert" ON public.pipelines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Pipelines: Update" ON public.pipelines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Pipelines: Delete" ON public.pipelines FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Tags: Select" ON public.tags FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Tags: Insert" ON public.tags FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tags: Update" ON public.tags FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tags: Delete" ON public.tags FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. CHECK Constraints para campos de status e tipo
ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS chk_financial_type;
ALTER TABLE public.financial_transactions ADD CONSTRAINT chk_financial_type CHECK (type IN ('receita', 'custo', 'despesa'));

ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS chk_pipeline_type;
ALTER TABLE public.pipelines ADD CONSTRAINT chk_pipeline_type CHECK (type IN ('Geral', 'Evento', 'Produto'));

ALTER TABLE public.lead_pipelines DROP CONSTRAINT IF EXISTS chk_lead_pipeline_stage;
ALTER TABLE public.lead_pipelines ADD CONSTRAINT chk_lead_pipeline_stage CHECK (stage IN ('Lead', 'Qualificacao', 'Proposta', 'Fechado'));
