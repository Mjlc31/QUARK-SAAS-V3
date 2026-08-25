-- ============================================================
--  QUARK OS — PATCH FINAL: Remover NOT NULL das colunas legadas
--  Execute no SQL Editor do Supabase → New query → Cole → RUN
--  Isso resolve o erro: "null value in column 'name' violates not-null constraint"
-- ============================================================

-- Remove NOT NULL das colunas legadas (o dado real fica em 'data' JSONB)
ALTER TABLE public.leads ALTER COLUMN name    DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN email   DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN phone   DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN status  DROP NOT NULL;

-- Garante que a coluna 'data' existe (caso não tenha sido adicionada ainda)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data       JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id    UUID;

-- ✅ CONCLUÍDO
