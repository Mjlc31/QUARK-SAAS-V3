-- ============================================================
-- PROPOSAL ENGINE v5.0 — Migração SQL
-- Novos campos na tabela proposals + Tabela de versões
-- ============================================================

-- 1. Adicionar novos campos à tabela proposals
ALTER TABLE public.proposals 
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS roof_type TEXT,
  ADD COLUMN IF NOT EXISTS installation_cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Índice para lead_id (se não existir)
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON public.proposals(lead_id);

-- 2. Tabela de versionamento de propostas
CREATE TABLE IF NOT EXISTS public.proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id TEXT NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  city TEXT,
  system_size_kw NUMERIC(8,2),
  final_price NUMERIC(12,2),
  data JSONB NOT NULL DEFAULT '{}',
  blocks JSONB,
  theme JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_proposal_version UNIQUE (proposal_id, version)
);

CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_id 
  ON public.proposal_versions(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_versions_created_at 
  ON public.proposal_versions(created_at DESC);

-- 3. RLS para proposal_versions
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;

-- Política: usuário só pode ver versões de suas próprias propostas
CREATE POLICY "Users can view their own proposal versions"
  ON public.proposal_versions
  FOR SELECT
  TO authenticated
  USING (
    proposal_id IN (
      SELECT id FROM public.proposals WHERE user_id = auth.uid()
    )
  );

-- Política: usuário só pode inserir versões de suas próprias propostas
CREATE POLICY "Users can insert versions for their own proposals"
  ON public.proposal_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    proposal_id IN (
      SELECT id FROM public.proposals WHERE user_id = auth.uid()
    )
  );

-- Política: usuário só pode deletar versões de suas próprias propostas
CREATE POLICY "Users can delete versions of their own proposals"
  ON public.proposal_versions
  FOR DELETE
  TO authenticated
  USING (
    proposal_id IN (
      SELECT id FROM public.proposals WHERE user_id = auth.uid()
    )
  );
