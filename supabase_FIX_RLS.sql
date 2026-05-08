-- ============================================================
--  QUARK OS — FIX COMPLETO: RLS + TABELAS FALTANTES
--  Execute TODO este bloco no SQL Editor do Supabase
--  Supabase Dashboard → SQL Editor → New query → Cole → RUN
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. LEADS — Garantir tabela e política permissiva (time compartilhado)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leads_user    ON public.leads (user_id);
CREATE INDEX IF NOT EXISTS idx_leads_updated ON public.leads (updated_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas
DROP POLICY IF EXISTS "Leads: team access" ON public.leads;
DROP POLICY IF EXISTS "Leads: all access" ON public.leads;
DROP POLICY IF EXISTS "Leads: anon insert" ON public.leads;

-- Política nova: qualquer usuário autenticado OU anon pode ler/escrever (time compartilhado)
CREATE POLICY "Leads: open team access"
    ON public.leads FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 2. TASKS — Garantir tabela e política permissiva
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks: team access" ON public.tasks;

CREATE POLICY "Tasks: open team access"
    ON public.tasks FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 3. PROJECTS — Garantir tabela e política permissiva
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects: team access" ON public.projects;

CREATE POLICY "Projects: open team access"
    ON public.projects FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 4. PRODUCTS — Garantir tabela e política permissiva
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products: all authenticated" ON public.products;

CREATE POLICY "Products: open team access"
    ON public.products FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 5. PIPELINES (CRM v2)
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

CREATE POLICY "Pipelines: open team access"
    ON public.pipelines FOR ALL
    USING (true)
    WITH CHECK (true);

-- Seeds dos Pipelines padrão
INSERT INTO public.pipelines (id, name, type, color) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Geral',          'Geral',  '#a3e635'),
    ('00000000-0000-0000-0000-000000000002', 'Evento — Tênis', 'Evento', '#38bdf8'),
    ('00000000-0000-0000-0000-000000000003', 'Evento — Poker', 'Evento', '#f472b6'),
    ('00000000-0000-0000-0000-000000000004', 'Evento — Ritmo', 'Evento', '#fb923c')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. TAGS (CRM v2)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tags (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1'
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tags: authenticated full access" ON public.tags;

CREATE POLICY "Tags: open team access"
    ON public.tags FOR ALL
    USING (true)
    WITH CHECK (true);

-- Seeds das Tags padrão
INSERT INTO public.tags (name, color) VALUES
    ('Anúncios',           '#f59e0b'),
    ('Indicação',          '#10b981'),
    ('Instagram orgânico', '#8b5cf6'),
    ('Google Ads',         '#3b82f6'),
    ('Indicação interna',  '#ec4899')
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 7. LEAD_PIPELINES (lead x funil)
-- ─────────────────────────────────────────────────────────────
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

CREATE POLICY "LeadPipelines: open team access"
    ON public.lead_pipelines FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 8. LEAD_TAGS (lead x etiqueta)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_tags (
    lead_id TEXT NOT NULL,
    tag_id  UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, tag_id)
);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "LeadTags: authenticated full access" ON public.lead_tags;

CREATE POLICY "LeadTags: open team access"
    ON public.lead_tags FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 9. FINANCIAL_TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('receita', 'custo', 'despesa')),
    category    TEXT NOT NULL CHECK (category IN (
        'instalacao_residencial', 'instalacao_comercial', 'manutencao', 'outros_receita',
        'equipamentos', 'mao_de_obra', 'frete', 'outros_cpv',
        'salarios', 'marketing', 'aluguel', 'combustivel', 'software', 'imposto', 'outras_despesas'
    )),
    amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date        DATE NOT NULL,
    note        TEXT,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Financial: users manage own transactions" ON public.financial_transactions;

CREATE POLICY "Financial: open team access"
    ON public.financial_transactions FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 10. PROFILES — trigger de criação automática
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT,
    email           TEXT,
    role            TEXT DEFAULT 'Sales' CHECK (role IN ('Admin', 'Sales', 'Engineer')),
    avatar_initials TEXT DEFAULT 'U',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: users see own profile" ON public.profiles;
CREATE POLICY "Profiles: open team access"
    ON public.profiles FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- ✅ FIM DO FIX — Todas as tabelas criadas e RLS corrigido
-- ─────────────────────────────────────────────────────────────
