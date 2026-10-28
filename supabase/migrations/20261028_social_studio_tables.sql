-- ==============================================================================
-- MIGRATION: SOCIAL STUDIO - INSTAGRAM & REELS MANAGEMENT
-- Data: 2026-10-28
-- Descrição: Tabelas para conexões de contas sociais (Instagram Business/Creator)
--            e agendamento/publicação de posts e Reels em massa.
-- ==============================================================================

-- 1. Tabela de Contas Conectadas
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'instagram', -- 'instagram', 'facebook', 'tiktok', 'youtube'
    account_name TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar_url TEXT,
    instagram_business_id TEXT,
    facebook_page_id TEXT,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'expired', 'error', 'disconnected'
    followers_count INTEGER DEFAULT 0,
    media_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_username ON public.social_accounts(username);

-- 2. Tabela de Posts e Agendamento em Massa
CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    caption TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb, -- Array de URLs (vídeos/imagens)
    media_type TEXT NOT NULL DEFAULT 'REELS', -- 'REELS', 'IMAGE', 'CAROUSEL', 'STORY'
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'draft', 'scheduled', 'publishing', 'published', 'failed'
    scheduled_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    published_post_url TEXT,
    instagram_container_id TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para fila de agendamento e performance do worker
CREATE INDEX IF NOT EXISTS idx_social_posts_account_id ON public.social_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON public.social_posts(scheduled_at);

-- 3. Habilitar RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS permissivas para o time interno da Quark
DROP POLICY IF EXISTS "Permitir leitura de contas sociais para autenticados" ON public.social_accounts;
CREATE POLICY "Permitir leitura de contas sociais para autenticados"
ON public.social_accounts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura e escrita de posts para autenticados" ON public.social_posts;
CREATE POLICY "Permitir leitura e escrita de posts para autenticados"
ON public.social_posts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Permissões para anon/service_role
GRANT ALL ON public.social_accounts TO service_role;
GRANT ALL ON public.social_posts TO service_role;
GRANT SELECT ON public.social_accounts TO anon;
GRANT SELECT ON public.social_posts TO anon;
