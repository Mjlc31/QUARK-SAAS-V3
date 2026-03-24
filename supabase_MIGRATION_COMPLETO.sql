-- ============================================================
--  QUARK OS — SCRIPT DE MIGRAÇÃO COMPLETO (v2 — SAFE)
--  Execute TODO este bloco no SQL Editor do Supabase
--  Supabase → SQL Editor → New query → Cole e clique em RUN
--  ✅ Seguro rodar em banco existente (usa IF NOT EXISTS)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES (perfis de usuários autenticados)
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
CREATE POLICY "Profiles: users see own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Cria o profile automaticamente quando um novo usuário se registra
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
-- 2. LEADS (CRM — funil de vendas)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Adiciona user_id se ainda não existir (tabela pode ter sido criada antes)
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_leads_user    ON public.leads (user_id);
CREATE INDEX IF NOT EXISTS idx_leads_updated ON public.leads (updated_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leads: team access" ON public.leads;
CREATE POLICY "Leads: team access"
    ON public.leads FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 3. TASKS (tarefas e acompanhamento)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks (user_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks: team access" ON public.tasks;
CREATE POLICY "Tasks: team access"
    ON public.tasks FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 4. PRODUCTS (catálogo de produtos / equipamentos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products: all authenticated" ON public.products;
CREATE POLICY "Products: all authenticated"
    ON public.products FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────
-- 5. PROJECTS (projetos de instalação / follow-up)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects (user_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects: team access" ON public.projects;
CREATE POLICY "Projects: team access"
    ON public.projects FOR ALL
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 6. WHATSAPP_MESSAGES (histórico de mensagens do WhatsApp)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id         TEXT PRIMARY KEY,
    body       TEXT NOT NULL,
    from_user  TEXT NOT NULL,
    to_user    TEXT NOT NULL,
    from_me    BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp  BIGINT NOT NULL,
    chat_name  TEXT,
    is_group   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_from      ON public.whatsapp_messages (from_user);
CREATE INDEX IF NOT EXISTS idx_wa_timestamp ON public.whatsapp_messages (timestamp DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WhatsApp: authenticated full access" ON public.whatsapp_messages;
CREATE POLICY "WhatsApp: authenticated full access"
    ON public.whatsapp_messages FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────
-- 7. FINANCIAL_TRANSACTIONS (lançamentos financeiros / DRE)
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
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.financial_transactions
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fin_date ON public.financial_transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_fin_type ON public.financial_transactions (type);
CREATE INDEX IF NOT EXISTS idx_fin_user ON public.financial_transactions (user_id);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Financial: users manage own transactions" ON public.financial_transactions;
CREATE POLICY "Financial: users manage own transactions"
    ON public.financial_transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 8. LANDING_PAGE_LEADS (leads captados pela landing page)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_page_leads (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name           TEXT,
    phone          TEXT,
    email          TEXT,
    city           TEXT,
    consumption    TEXT,
    form_type      TEXT,
    payment_method TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landing leads: insert public" ON public.landing_page_leads;
CREATE POLICY "Landing leads: insert public"
    ON public.landing_page_leads FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Landing leads: select authenticated" ON public.landing_page_leads;
CREATE POLICY "Landing leads: select authenticated"
    ON public.landing_page_leads FOR SELECT
    USING (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────
-- ✅ FIM DO SCRIPT
-- Todas as tabelas foram criadas/atualizadas com segurança
-- ─────────────────────────────────────────────────────────────
