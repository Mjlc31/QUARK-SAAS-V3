-- ============================================================
--  QUARK OS — SQL DEFINITIVO (v3 — 100% Idempotente)
--  Execute no SQL Editor do Supabase → New query → Cole → RUN
--  Pode rodar quantas vezes quiser sem erro.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- ETAPA 1: DERRUBAR TODAS as políticas conhecidas (todas as variantes)
-- ─────────────────────────────────────────────────────────────

-- LEADS
DROP POLICY IF EXISTS "Leads: team access"          ON public.leads;
DROP POLICY IF EXISTS "Leads: all access"            ON public.leads;
DROP POLICY IF EXISTS "Leads: anon insert"           ON public.leads;
DROP POLICY IF EXISTS "Leads: open team access"      ON public.leads;
DROP POLICY IF EXISTS "Leads: full open access"      ON public.leads;

-- TASKS
DROP POLICY IF EXISTS "Tasks: team access"           ON public.tasks;
DROP POLICY IF EXISTS "Tasks: open team access"      ON public.tasks;
DROP POLICY IF EXISTS "Tasks: full open access"      ON public.tasks;

-- PROJECTS
DROP POLICY IF EXISTS "Projects: team access"        ON public.projects;
DROP POLICY IF EXISTS "Projects: open team access"   ON public.projects;
DROP POLICY IF EXISTS "Projects: full open access"   ON public.projects;

-- PRODUCTS
DROP POLICY IF EXISTS "Products: all authenticated"  ON public.products;
DROP POLICY IF EXISTS "Products: open team access"   ON public.products;
DROP POLICY IF EXISTS "Products: full open access"   ON public.products;

-- PIPELINES
DROP POLICY IF EXISTS "Pipelines: authenticated full access" ON public.pipelines;
DROP POLICY IF EXISTS "Pipelines: open team access"          ON public.pipelines;
DROP POLICY IF EXISTS "Pipelines: full open access"          ON public.pipelines;

-- TAGS
DROP POLICY IF EXISTS "Tags: authenticated full access" ON public.tags;
DROP POLICY IF EXISTS "Tags: open team access"          ON public.tags;
DROP POLICY IF EXISTS "Tags: full open access"          ON public.tags;

-- LEAD_PIPELINES
DROP POLICY IF EXISTS "LeadPipelines: authenticated full access" ON public.lead_pipelines;
DROP POLICY IF EXISTS "LeadPipelines: open team access"          ON public.lead_pipelines;
DROP POLICY IF EXISTS "LeadPipelines: full open access"          ON public.lead_pipelines;

-- LEAD_TAGS
DROP POLICY IF EXISTS "LeadTags: authenticated full access" ON public.lead_tags;
DROP POLICY IF EXISTS "LeadTags: open team access"          ON public.lead_tags;
DROP POLICY IF EXISTS "LeadTags: full open access"          ON public.lead_tags;

-- FINANCIAL
DROP POLICY IF EXISTS "Financial: users manage own transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Financial: open team access"              ON public.financial_transactions;
DROP POLICY IF EXISTS "Financial: full open access"              ON public.financial_transactions;

-- PROFILES
DROP POLICY IF EXISTS "Profiles: users see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: open team access"      ON public.profiles;
DROP POLICY IF EXISTS "Profiles: full open access"      ON public.profiles;


-- ─────────────────────────────────────────────────────────────
-- ETAPA 2: GARANTIR ESTRUTURA DAS TABELAS + COLUNAS
-- ─────────────────────────────────────────────────────────────

-- LEADS
CREATE TABLE IF NOT EXISTS public.leads (
    id         TEXT PRIMARY KEY,
    data       JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data       JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id    UUID;

-- TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
    id         TEXT PRIMARY KEY,
    data       JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS data       JSONB;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id         TEXT PRIMARY KEY,
    data       JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data       JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id         TEXT PRIMARY KEY,
    data       JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS data       JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PIPELINES
CREATE TABLE IF NOT EXISTS public.pipelines (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'Geral',
    color      TEXT NOT NULL DEFAULT '#a3e635',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TAGS
CREATE TABLE IF NOT EXISTS public.tags (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1'
);

-- LEAD_PIPELINES
CREATE TABLE IF NOT EXISTS public.lead_pipelines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id     TEXT NOT NULL,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    stage       TEXT NOT NULL DEFAULT 'Lead',
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (lead_id, pipeline_id)
);

-- LEAD_TAGS
CREATE TABLE IF NOT EXISTS public.lead_tags (
    lead_id TEXT NOT NULL,
    tag_id  UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, tag_id)
);

-- FINANCIAL_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    type        TEXT NOT NULL,
    category    TEXT NOT NULL,
    amount      NUMERIC(12, 2) NOT NULL,
    date        DATE NOT NULL,
    note        TEXT,
    user_id     UUID,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY,
    name            TEXT,
    email           TEXT,
    role            TEXT DEFAULT 'Sales',
    avatar_initials TEXT DEFAULT 'U',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- ETAPA 3: HABILITAR RLS + CRIAR POLÍTICAS ABERTAS (time compartilhado)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipelines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quark_leads_auth"               ON public.leads               AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_tasks_auth"               ON public.tasks               AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_projects_auth"            ON public.projects            AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_products_auth"            ON public.products            AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_pipelines_auth"           ON public.pipelines           AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_tags_auth"                ON public.tags                AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_lead_pipelines_auth"      ON public.lead_pipelines      AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_lead_tags_auth"           ON public.lead_tags           AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_financial_auth"           ON public.financial_transactions AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quark_profiles_auth"            ON public.profiles            AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- ETAPA 4: SEEDS (dados padrão)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.pipelines (id, name, type, color) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Geral',          'Geral',  '#a3e635'),
    ('00000000-0000-0000-0000-000000000002', 'Evento — Tênis', 'Evento', '#38bdf8'),
    ('00000000-0000-0000-0000-000000000003', 'Evento — Poker', 'Evento', '#f472b6'),
    ('00000000-0000-0000-0000-000000000004', 'Evento — Ritmo', 'Evento', '#fb923c')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tags (name, color) VALUES
    ('Anúncios',           '#f59e0b'),
    ('Indicação',          '#10b981'),
    ('Instagram orgânico', '#8b5cf6'),
    ('Google Ads',         '#3b82f6'),
    ('Indicação interna',  '#ec4899')
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- ETAPA 5: TRIGGER DE CRIAÇÃO DE PROFILE
-- ─────────────────────────────────────────────────────────────

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
-- ETAPA 6: OTIMIZAÇÕES DE PERFORMANCE E INTEGRIDADE (FOREIGN KEYS & ÍNDICES)
-- ─────────────────────────────────────────────────────────────

-- Adiciona a Foreign Key amarrando os pipelines e tags ao lead real
ALTER TABLE public.lead_pipelines DROP CONSTRAINT IF EXISTS fk_lead_pipelines_lead_id;
ALTER TABLE public.lead_pipelines ADD CONSTRAINT fk_lead_pipelines_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.lead_tags DROP CONSTRAINT IF EXISTS fk_lead_tags_lead_id;
ALTER TABLE public.lead_tags ADD CONSTRAINT fk_lead_tags_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS fk_financial_user;
ALTER TABLE public.financial_transactions ADD CONSTRAINT fk_financial_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índices GIN para colunas JSONB
CREATE INDEX IF NOT EXISTS leads_data_gin_idx ON public.leads USING GIN (data);
CREATE INDEX IF NOT EXISTS tasks_data_gin_idx ON public.tasks USING GIN (data);
CREATE INDEX IF NOT EXISTS projects_data_gin_idx ON public.projects USING GIN (data);
CREATE INDEX IF NOT EXISTS products_data_gin_idx ON public.products USING GIN (data);

-- Índices B-Tree para Foreign Keys e Datas
CREATE INDEX IF NOT EXISTS financial_date_idx ON public.financial_transactions (date);
CREATE INDEX IF NOT EXISTS financial_type_idx ON public.financial_transactions (type);
CREATE INDEX IF NOT EXISTS lead_pipelines_lead_id_idx ON public.lead_pipelines (lead_id);
CREATE INDEX IF NOT EXISTS lead_tags_lead_id_idx ON public.lead_tags (lead_id);



-- ─────────────────────────────────────────────────────────────
-- ✅ CONCLUÍDO — Banco 100% configurado
-- ─────────────────────────────────────────────────────────────
