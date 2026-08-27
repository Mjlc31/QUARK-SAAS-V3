-- ============================================================
-- Migration: Criar tabela de propostas comerciais
-- Quark Energia — 2026-08-27
-- ============================================================

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  city TEXT,
  phone TEXT,
  system_size_kw NUMERIC(8,2),
  final_price NUMERIC(12,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected')),
  data JSONB NOT NULL DEFAULT '{}',
  blocks JSONB,
  theme JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select_own" ON proposals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "proposals_insert_own" ON proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proposals_update_own" ON proposals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proposals_delete_own" ON proposals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_proposals_updated_at();
