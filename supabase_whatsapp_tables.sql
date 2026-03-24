-- Execute este script no painel SQL do seu Supabase para criar as tabelas do WhatsApp

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    from_me BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp BIGINT NOT NULL,
    chat_name TEXT,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (opcional)
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Exemplo de política: permitir tudo (por ser banco interno)
CREATE POLICY "Enable all operations for authenticated users" ON public.whatsapp_messages
    FOR ALL
    USING (true)
    WITH CHECK (true);
