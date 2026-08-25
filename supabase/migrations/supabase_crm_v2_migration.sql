-- ============================================================
--  QUARK OS — CRM v2 MIGRATION (FIX: sem FK em leads.id)
--  Features: Multi-Pipeline, Tags, Lead em Múltiplos Pipelines, Dados Empresa
--  ✅ Seguro rodar em banco existente (usa IF NOT EXISTS / ON CONFLICT DO NOTHING)
--  Execute no SQL Editor do Supabase → New query → Cole e clique em RUN
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. PIPELINES (funis de venda por tipo/evento)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipelines (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'Geral' CHECK (type IN ('Geral', 'Evento', 'Produto')),
    color      TEXT NOT NULL DEFAULT '#a3e635',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pipelines: authenticated full access" ON public.pipelines;
CREATE POLICY "Pipelines: authenticated full access"
    ON public.pipelines FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Seeds dos Pipelines padrão
INSERT INTO public.pipelines (id, name, type, color) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Geral',          'Geral',  '#a3e635'),
    ('00000000-0000-0000-0000-000000000002', 'Evento — Tênis', 'Evento', '#38bdf8'),
    ('00000000-0000-0000-0000-000000000003', 'Evento — Poker', 'Evento', '#f472b6'),
    ('00000000-0000-0000-0000-000000000004', 'Evento — Ritmo', 'Evento', '#fb923c')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 2. LEAD_PIPELINES (lead x pipeline — stage independente por funil)
--    lead_id é TEXT para compatibilidade com leads.id (pode ser UUID ou TEXT)
--    Sem FK em leads(id) para evitar conflito de tipos entre ambientes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_pipelines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id     TEXT NOT NULL,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    stage       TEXT NOT NULL DEFAULT 'Lead' CHECK (stage IN ('Lead', 'Qualificacao', 'Proposta', 'Fechado')),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (lead_id, pipeline_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_pipelines_lead     ON public.lead_pipelines (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipelines_pipeline ON public.lead_pipelines (pipeline_id);

ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "LeadPipelines: authenticated full access" ON public.lead_pipelines;
CREATE POLICY "LeadPipelines: authenticated full access"
    ON public.lead_pipelines FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────
-- 3. TAGS (etiquetas globais de lead)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tags (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1'
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tags: authenticated full access" ON public.tags;
CREATE POLICY "Tags: authenticated full access"
    ON public.tags FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Seeds das Tags padrão
INSERT INTO public.tags (name, color) VALUES
    ('Anúncios',           '#f59e0b'),
    ('Indicação',          '#10b981'),
    ('Instagram orgânico', '#8b5cf6'),
    ('Google Ads',         '#3b82f6'),
    ('Indicação interna',  '#ec4899')
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 4. LEAD_TAGS (lead x tags — multi-seleção)
--    lead_id é TEXT para compatibilidade (sem FK em leads.id)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_tags (
    lead_id TEXT NOT NULL,
    tag_id  UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON public.lead_tags (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag  ON public.lead_tags (tag_id);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "LeadTags: authenticated full access" ON public.lead_tags;
CREATE POLICY "LeadTags: authenticated full access"
    ON public.lead_tags FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────
-- 5. CAMPOS EMPRESA nos LEADS
--    Armazenados dentro do campo `data` JSONB da tabela leads:
--      data.personType        → 'PF' | 'PJ'
--      data.companyName       → Razão Social
--      data.cnpj              → CNPJ (formato XX.XXX.XXX/XXXX-XX)
--      data.stateRegistration → Inscrição Estadual
--    Nenhuma migração de schema necessária.
-- ─────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- ✅ FIM DA MIGRATION CRM v2
-- ─────────────────────────────────────────────────────────────
