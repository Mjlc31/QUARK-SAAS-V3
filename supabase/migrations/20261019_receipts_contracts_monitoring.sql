-- ============================================================
-- 2026-10-19 — Recibos Financeiros e Gestão de Contratos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number BIGINT GENERATED ALWAYS AS IDENTITY,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    payer_name TEXT NOT NULL,
    payer_doc TEXT,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    method TEXT DEFAULT 'PIX',
    installment TEXT,
    paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
    city TEXT DEFAULT 'Maceió/AL',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_lead_id ON public.receipts (lead_id);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts_access" ON public.receipts;
CREATE POLICY "receipts_access" ON public.receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- Contratos e Documentos Digitais com Assinatura
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('procuracao', 'aluguel', 'contrato')),
    title TEXT NOT NULL,
    lead_id TEXT REFERENCES public.leads (id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'assinado', 'cancelado')),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_signers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf TEXT,
    position INT NOT NULL DEFAULT 0,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signed_name TEXT,
    signed_cpf TEXT,
    signature TEXT,
    ip TEXT,
    user_agent TEXT,
    content_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_lead ON public.documents (lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON public.documents (kind);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents (status);
CREATE INDEX IF NOT EXISTS idx_doc_signers_doc ON public.document_signers (document_id);
CREATE INDEX IF NOT EXISTS idx_doc_signers_token ON public.document_signers (token);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_access" ON public.documents;
CREATE POLICY "documents_access" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "signers_access" ON public.document_signers;
CREATE POLICY "signers_access" ON public.document_signers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "signers_anon_token_read" ON public.document_signers;
CREATE POLICY "signers_anon_token_read" ON public.document_signers FOR SELECT TO anon, authenticated USING (token IS NOT NULL);

