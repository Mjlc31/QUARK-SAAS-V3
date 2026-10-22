-- =========================================================================
-- FIX: Adiciona coluna deleted_at nas tabelas referenciadas por RLS policies
-- que filtram por (deleted_at IS NULL), mas nunca tiveram a coluna criada.
-- Sem essa coluna, o PostgreSQL retorna ZERO linhas no SELECT.
-- =========================================================================

-- opportunities
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- financial_transactions
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Índices parciais para soft-delete (evita full-scan em tabelas grandes)
CREATE INDEX IF NOT EXISTS idx_opportunities_active
  ON public.opportunities (user_id, created_at DESC)
  WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_proposals_active
  ON public.proposals (user_id, created_at DESC)
  WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_fin_transactions_active
  ON public.financial_transactions (user_id, date DESC)
  WHERE (deleted_at IS NULL);
