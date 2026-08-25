-- ============================================================
--  QUARK OS — SCRIPT DE MIGRAÇÃO: CPQ NATIVO
-- ============================================================

-- Tabela de Kits Solares (Padrões de Engenharia)
CREATE TABLE IF NOT EXISTS public.solar_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    system_size_kw NUMERIC NOT NULL,
    modules_count INTEGER NOT NULL,
    inverter_size_kw NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    margin_percentage NUMERIC DEFAULT 30.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.solar_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solar Kits: team access" ON public.solar_kits;
CREATE POLICY "Solar Kits: team access"
    ON public.solar_kits FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert de alguns kits padrões para teste (CPQ)
INSERT INTO public.solar_kits (name, system_size_kw, modules_count, inverter_size_kw, price, margin_percentage)
VALUES 
('Kit Residencial P (3kWp)', 3.3, 6, 3.0, 12000.00, 35.0),
('Kit Residencial M (5kWp)', 5.5, 10, 5.0, 18000.00, 35.0),
('Kit Comercial P (10kWp)', 11.0, 20, 10.0, 35000.00, 30.0)
ON CONFLICT DO NOTHING;
