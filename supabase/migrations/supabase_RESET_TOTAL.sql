-- ============================================================
--  QUARK OS — MEGA RESET & SETUP TOTAL (DANGER ZONE)
--  ⚠️ AVISO: Este script apaga TODAS as tabelas e recria a arquitetura perfeita.
--  Execute no SQL Editor do Supabase → New query → Cole → RUN
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. DROP CASCADE — Limpeza profunda do esquema atual
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.lead_tags CASCADE;
DROP TABLE IF EXISTS public.lead_pipelines CASCADE;
DROP TABLE IF EXISTS public.financial_transactions CASCADE;
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;
DROP TABLE IF EXISTS public.landing_page_leads CASCADE;
DROP TABLE IF EXISTS public.proposals CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.pipelines CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- ─────────────────────────────────────────────────────────────
-- 2. RECRIAR TABELAS (Arquitetura Otimizada e Documentada)
-- ─────────────────────────────────────────────────────────────

-- 2.1 Perfis de Usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'Sales',
    avatar_initials TEXT DEFAULT 'U',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 CRM: Leads
CREATE TABLE public.leads (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 CRM: Relacional (Pipelines e Tags)
CREATE TABLE public.pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Geral',
    color TEXT NOT NULL DEFAULT '#a3e635',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE public.lead_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    stage TEXT NOT NULL DEFAULT 'Lead',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lead_id, pipeline_id)
);

CREATE TABLE public.lead_tags (
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, tag_id)
);

-- 2.4 PROPOSTAS (Novo: Armazenamento do WYSIWYG)
CREATE TABLE public.proposals (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    data JSONB NOT NULL, -- Guarda theme, blocks, totalValue, etc.
    status TEXT DEFAULT 'Draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Tarefas, Projetos e Produtos
CREATE TABLE public.tasks (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.projects (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.products (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Financeiro e Utilitários
CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.whatsapp_messages (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    from_me BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp BIGINT NOT NULL,
    chat_name TEXT,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.landing_page_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT,
    email TEXT,
    city TEXT,
    consumption TEXT,
    form_type TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS) ABERTO PARA A EQUIPE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quark_profiles_open"   ON public.profiles   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_leads_open"      ON public.leads      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_pipelines_open"  ON public.pipelines  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_tags_open"       ON public.tags       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_lp_open"         ON public.lead_pipelines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_lt_open"         ON public.lead_tags  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_proposals_open"  ON public.proposals  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_tasks_open"      ON public.tasks      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_projects_open"   ON public.projects   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_products_open"   ON public.products   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_fin_open"        ON public.financial_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_wpp_open"        ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "quark_landing_open"    ON public.landing_page_leads FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 4. CRIAÇÃO DE BUCKETS DE STORAGE E POLÍTICAS DE ACESSO
-- ─────────────────────────────────────────────────────────────
-- Inserindo os buckets oficiais documentados (Se existir, não faz nada)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('crm_docs', 'crm_docs', true),
  ('proposal_assets', 'proposal_assets', true),
  ('proposals_pdf', 'proposals_pdf', true),
  ('engineering_docs', 'engineering_docs', true),
  ('catalog_assets', 'catalog_assets', true),
  ('whatsapp_media', 'whatsapp_media', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Liberar RLS total para os buckets no storage (Upload/Download liberado pra equipe e clientes)
DROP POLICY IF EXISTS "Quark Storage Open" ON storage.objects;
CREATE POLICY "Quark Storage Open" 
ON storage.objects FOR ALL 
USING (bucket_id IN ('crm_docs', 'proposal_assets', 'proposals_pdf', 'engineering_docs', 'catalog_assets', 'whatsapp_media', 'avatars'))
WITH CHECK (bucket_id IN ('crm_docs', 'proposal_assets', 'proposals_pdf', 'engineering_docs', 'catalog_assets', 'whatsapp_media', 'avatars'));


-- ─────────────────────────────────────────────────────────────
-- 5. SEEDS (INSERTS INICIAIS)
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
-- 6. TRIGGERS (AUTOMATIZAÇÕES)
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

-- ============================================================
-- ✅ MEGA SETUP CONCLUÍDO
-- O banco agora está idêntico à documentação da arquitetura!
-- ============================================================
