-- ─── Tabela: financial_transactions ──────────────────────────────────────────
-- Lançamentos financeiros da Quark Energia (Receitas, Custos, Despesas)
-- Execute este script no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    description TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('receita', 'custo', 'despesa')),
    category    TEXT NOT NULL,
    amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date        DATE NOT NULL,
    note        TEXT,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para performance nas consultas por período
CREATE INDEX IF NOT EXISTS idx_financial_date ON public.financial_transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_type ON public.financial_transactions (type);
CREATE INDEX IF NOT EXISTS idx_financial_user ON public.financial_transactions (user_id);

-- Row Level Security — cada usuário vê só seus próprios lançamentos
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own transactions" ON public.financial_transactions;
CREATE POLICY "Users can manage own transactions"
    ON public.financial_transactions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Dados de exemplo para testar (opcional — comente se não quiser seed)
-- INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id)
-- VALUES
--     ('Instalação Casa João Silva', 'receita', 'instalacao_residencial', 14735.00, '2026-03-02', 'À vista', auth.uid()),
--     ('Equipamentos lote março', 'custo', 'equipamentos', 18400.00, '2026-03-01', null, auth.uid());
