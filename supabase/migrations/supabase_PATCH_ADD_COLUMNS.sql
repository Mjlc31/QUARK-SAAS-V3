-- ============================================================
--  QUARK OS — PATCH: Adicionar coluna 'data' JSONB nas tabelas existentes
--  Execute no SQL Editor do Supabase → New query → Cole → RUN
--  Seguro rodar em banco existente (usa ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- 1. LEADS — Adicionar coluna data (JSONB) se não existir
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. TASKS — Adicionar coluna data (JSONB) se não existir
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. PROJECTS — Adicionar coluna data (JSONB) se não existir
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. PRODUCTS — Adicionar coluna data (JSONB) se não existir
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Corrigir RLS das tabelas (remover políticas restritivas e abrir para o time)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leads: team access" ON public.leads;
DROP POLICY IF EXISTS "Leads: open team access" ON public.leads;
CREATE POLICY "Leads: full open access"
    ON public.leads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasks: team access" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: open team access" ON public.tasks;
CREATE POLICY "Tasks: full open access"
    ON public.tasks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Projects: team access" ON public.projects;
DROP POLICY IF EXISTS "Projects: open team access" ON public.projects;
CREATE POLICY "Projects: full open access"
    ON public.projects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products: all authenticated" ON public.products;
DROP POLICY IF EXISTS "Products: open team access" ON public.products;
CREATE POLICY "Products: full open access"
    ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 6. PIPELINES — Criar se não existir + RLS aberto
CREATE TABLE IF NOT EXISTS public.pipelines (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'Geral' CHECK (type IN ('Geral', 'Evento', 'Produto')),
    color      TEXT NOT NULL DEFAULT '#a3e635',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pipelines: authenticated full access" ON public.pipelines;
DROP POLICY IF EXISTS "Pipelines: open team access" ON public.pipelines;
CREATE POLICY "Pipelines: full open access"
    ON public.pipelines FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.pipelines (id, name, type, color) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Geral',          'Geral',  '#a3e635'),
    ('00000000-0000-0000-0000-000000000002', 'Evento — Tênis', 'Evento', '#38bdf8'),
    ('00000000-0000-0000-0000-000000000003', 'Evento — Poker', 'Evento', '#f472b6'),
    ('00000000-0000-0000-0000-000000000004', 'Evento — Ritmo', 'Evento', '#fb923c')
ON CONFLICT (id) DO NOTHING;

-- 7. TAGS — Criar se não existir + RLS aberto
CREATE TABLE IF NOT EXISTS public.tags (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1'
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tags: authenticated full access" ON public.tags;
DROP POLICY IF EXISTS "Tags: open team access" ON public.tags;
CREATE POLICY "Tags: full open access"
    ON public.tags FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.tags (name, color) VALUES
    ('Anúncios',           '#f59e0b'),
    ('Indicação',          '#10b981'),
    ('Instagram orgânico', '#8b5cf6'),
    ('Google Ads',         '#3b82f6'),
    ('Indicação interna',  '#ec4899')
ON CONFLICT (name) DO NOTHING;

-- 8. LEAD_PIPELINES — Criar se não existir + RLS aberto
CREATE TABLE IF NOT EXISTS public.lead_pipelines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id     TEXT NOT NULL,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    stage       TEXT NOT NULL DEFAULT 'Lead' CHECK (stage IN ('Lead', 'Qualificacao', 'Proposta', 'Fechado')),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (lead_id, pipeline_id)
);
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "LeadPipelines: authenticated full access" ON public.lead_pipelines;
DROP POLICY IF EXISTS "LeadPipelines: open team access" ON public.lead_pipelines;
CREATE POLICY "LeadPipelines: full open access"
    ON public.lead_pipelines FOR ALL USING (true) WITH CHECK (true);

-- 9. LEAD_TAGS — Criar se não existir + RLS aberto
CREATE TABLE IF NOT EXISTS public.lead_tags (
    lead_id TEXT NOT NULL,
    tag_id  UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, tag_id)
);
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "LeadTags: authenticated full access" ON public.lead_tags;
DROP POLICY IF EXISTS "LeadTags: open team access" ON public.lead_tags;
CREATE POLICY "LeadTags: full open access"
    ON public.lead_tags FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- ✅ PATCH CONCLUÍDO
-- Rode este script e depois faça o Reload do Schema:
-- Supabase Dashboard → Settings → API → Reload Schema (ou aguarde 1 min)
-- ============================================================
