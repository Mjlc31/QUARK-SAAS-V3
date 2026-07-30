-- ============================================================
-- QUARK OS — PATCH DE MELHORIAS (Segurança, Performance, Integridade)
-- Execute no SQL Editor do Supabase para atualizar a base existente
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. CORREÇÃO DE SEGURANÇA: RESTRINGIR RLS PARA USUÁRIOS AUTENTICADOS
-- ─────────────────────────────────────────────────────────────

-- Remove as políticas abertas (públicas)
DROP POLICY IF EXISTS "quark_leads_open" ON public.leads;
DROP POLICY IF EXISTS "quark_tasks_open" ON public.tasks;
DROP POLICY IF EXISTS "quark_projects_open" ON public.projects;
DROP POLICY IF EXISTS "quark_products_open" ON public.products;
DROP POLICY IF EXISTS "quark_pipelines_open" ON public.pipelines;
DROP POLICY IF EXISTS "quark_tags_open" ON public.tags;
DROP POLICY IF EXISTS "quark_lead_pipelines_open" ON public.lead_pipelines;
DROP POLICY IF EXISTS "quark_lead_tags_open" ON public.lead_tags;
DROP POLICY IF EXISTS "quark_financial_open" ON public.financial_transactions;
DROP POLICY IF EXISTS "quark_profiles_open" ON public.profiles;

-- Cria políticas restritas (apenas usuários logados podem ver/editar os dados)
CREATE POLICY "quark_leads_auth" ON public.leads AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_tasks_auth" ON public.tasks AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_projects_auth" ON public.projects AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_products_auth" ON public.products AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_pipelines_auth" ON public.pipelines AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_tags_auth" ON public.tags AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_lead_pipelines_auth" ON public.lead_pipelines AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_lead_tags_auth" ON public.lead_tags AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_financial_auth" ON public.financial_transactions AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_profiles_auth" ON public.profiles AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. INTEGRIDADE DE DADOS (FOREIGN KEYS)
-- ─────────────────────────────────────────────────────────────

-- Remove dados órfãos antes de aplicar a foreign key para não dar erro
DELETE FROM public.lead_pipelines WHERE lead_id NOT IN (SELECT id FROM public.leads);
DELETE FROM public.lead_tags WHERE lead_id NOT IN (SELECT id FROM public.leads);

-- Adiciona a Foreign Key amarrando os pipelines e tags ao lead real
ALTER TABLE public.lead_pipelines
  ADD CONSTRAINT fk_lead_pipelines_lead_id
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.lead_tags
  ADD CONSTRAINT fk_lead_tags_lead_id
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Amarra as transações financeiras ao usuário
ALTER TABLE public.financial_transactions
  ADD CONSTRAINT fk_financial_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────────────
-- 3. PERFORMANCE (ÍNDICES)
-- ─────────────────────────────────────────────────────────────

-- Índices GIN para colunas JSONB (Buscas ultrarrápidas em campos dinâmicos)
CREATE INDEX IF NOT EXISTS leads_data_gin_idx ON public.leads USING GIN (data);
CREATE INDEX IF NOT EXISTS tasks_data_gin_idx ON public.tasks USING GIN (data);
CREATE INDEX IF NOT EXISTS projects_data_gin_idx ON public.projects USING GIN (data);
CREATE INDEX IF NOT EXISTS products_data_gin_idx ON public.products USING GIN (data);

-- Índices B-Tree para Foreign Keys e Datas (Filtros comuns)
CREATE INDEX IF NOT EXISTS financial_date_idx ON public.financial_transactions (date);
CREATE INDEX IF NOT EXISTS financial_type_idx ON public.financial_transactions (type);
CREATE INDEX IF NOT EXISTS lead_pipelines_lead_id_idx ON public.lead_pipelines (lead_id);
CREATE INDEX IF NOT EXISTS lead_tags_lead_id_idx ON public.lead_tags (lead_id);

-- ============================================================
-- PATCH CONCLUÍDO COM SUCESSO!
-- ============================================================
