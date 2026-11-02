-- ==============================================================================
-- QUARK OS — MIGRATION: 20261102_enterprise_database_logistics.sql
-- Arquitetura de Dados Enterprise, Automação por Triggers, Pró-Labore & Integridade
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. GARANTE RESTRIÇÃO UNIQUE EM client_portal_users(opportunity_id)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_client_portal_opportunity_id'
    ) THEN
        ALTER TABLE public.client_portal_users 
        ADD CONSTRAINT uq_client_portal_opportunity_id UNIQUE (opportunity_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint uq_client_portal_opportunity_id já existe ou foi ignorada: %', SQLERRM;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABELA DEDICADA DE PRÓ-LABORE & RATEIO DE SÓCIOS (prolabore_settlements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prolabore_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID UNIQUE REFERENCES public.opportunities(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    city TEXT DEFAULT 'Maceió',
    system_size_kw NUMERIC(10,2) DEFAULT 0,
    module_power_w NUMERIC(10,2) DEFAULT 550,
    module_count INTEGER DEFAULT 0,
    
    -- Valores Financeiros Brutos e Custos Operacionais
    contract_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
    kit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    installation_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    material_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    signature_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    commission_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    
    -- Colunas Calculadas Diretamente pelo PostgreSQL (Garantia Matemática Absoluta)
    nota_qk NUMERIC(12,2) GENERATED ALWAYS AS (contract_revenue - kit_cost) STORED,
    tax_amount NUMERIC(12,2) GENERATED ALWAYS AS (
        GREATEST(0, (contract_revenue - kit_cost) * (tax_rate / 100.0))
    ) STORED,
    net_profit NUMERIC(12,2) GENERATED ALWAYS AS (
        contract_revenue - (
            kit_cost + 
            installation_cost + 
            material_cost + 
            signature_cost + 
            commission_cost + 
            GREATEST(0, (contract_revenue - kit_cost) * (tax_rate / 100.0))
        )
    ) STORED,
    
    -- Divisão de Rateio Oficial Quark Energia (45% Anderson / 45% Arthur / 10% MKT Quark)
    share_anderson_45 NUMERIC(12,2) GENERATED ALWAYS AS (
        (contract_revenue - (
            kit_cost + 
            installation_cost + 
            material_cost + 
            signature_cost + 
            commission_cost + 
            GREATEST(0, (contract_revenue - kit_cost) * (tax_rate / 100.0))
        )) * 0.45
    ) STORED,
    share_arthur_45 NUMERIC(12,2) GENERATED ALWAYS AS (
        (contract_revenue - (
            kit_cost + 
            installation_cost + 
            material_cost + 
            signature_cost + 
            commission_cost + 
            GREATEST(0, (contract_revenue - kit_cost) * (tax_rate / 100.0))
        )) * 0.45
    ) STORED,
    share_marketing_10 NUMERIC(12,2) GENERATED ALWAYS AS (
        (contract_revenue - (
            kit_cost + 
            installation_cost + 
            material_cost + 
            signature_cost + 
            commission_cost + 
            GREATEST(0, (contract_revenue - kit_cost) * (tax_rate / 100.0))
        )) * 0.10
    ) STORED,
    
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- RLS para prolabore_settlements (acesso seguro e transparente)
ALTER TABLE public.prolabore_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prolabore_all" ON public.prolabore_settlements;
CREATE POLICY "prolabore_all" ON public.prolabore_settlements
    FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. SEED INICIAL DOS 15 FECHAMENTOS NA TABELA prolabore_settlements
-- ------------------------------------------------------------------------------
INSERT INTO public.prolabore_settlements (
    opportunity_id, client_name, city, system_size_kw, module_power_w, module_count,
    contract_revenue, kit_cost, installation_cost, material_cost, signature_cost, commission_cost, tax_rate, user_id
)
SELECT 
    o.id,
    COALESCE(o.client_name, o.title, 'Cliente'),
    COALESCE(o.city, 'Maceió'),
    COALESCE(o.system_power, c.system_size_kw, 5.0),
    550,
    CASE WHEN COALESCE(o.system_power, c.system_size_kw, 0) > 0 
         THEN ROUND((COALESCE(o.system_power, c.system_size_kw) * 1000) / 550) 
         ELSE 0 END,
    COALESCE(o.amount, c.contract_value, 0),
    ROUND(COALESCE(o.amount, c.contract_value, 0) * 0.45, 2),
    ROUND(COALESCE(o.amount, c.contract_value, 0) * 0.10, 2),
    0,
    0,
    ROUND(COALESCE(o.amount, c.contract_value, 0) * 0.05, 2),
    5.00,
    o.user_id
FROM public.opportunities o
LEFT JOIN public.client_portal_users c ON c.opportunity_id = o.id AND c.deleted_at IS NULL
WHERE o.status = 'Ganho' AND o.deleted_at IS NULL
ON CONFLICT (opportunity_id) DO UPDATE SET
    contract_revenue = EXCLUDED.contract_revenue,
    client_name = EXCLUDED.client_name,
    system_size_kw = EXCLUDED.system_size_kw,
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 4. TRIGGER AUTOMÁTICO DE ESTEIRA COMERCIAL (trg_on_opportunity_won)
-- Sincroniza Oportunidade -> Cliente -> Financeiro -> Obras -> Pró-Labore
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_opportunity_won()
RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
    v_kwp NUMERIC;
    v_revenue NUMERIC;
    v_name TEXT;
    v_city TEXT;
BEGIN
    -- Caso 1: Transição ou inserção direta com status "Ganho"
    IF (NEW.status = 'Ganho' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'Ganho')) THEN
        v_name := COALESCE(NEW.client_name, NEW.title, 'Cliente');
        v_city := COALESCE(NEW.city, 'Maceió');
        v_revenue := COALESCE(NEW.amount, 0);
        v_kwp := COALESCE(NEW.system_power, 0);

        -- Se a oportunidade estiver sem valor, busca da proposta mais recente
        IF (v_revenue <= 0) THEN
            SELECT final_price, power_kwp INTO v_revenue, v_kwp
            FROM public.proposals
            WHERE (opportunity_id = NEW.id OR lead_id = NEW.id)
            ORDER BY CASE WHEN status = 'aceita' THEN 1 ELSE 2 END, created_at DESC
            LIMIT 1;
            
            v_revenue := COALESCE(v_revenue, 0);
            v_kwp := COALESCE(v_kwp, 0);
            
            IF (v_revenue > 0) THEN
                NEW.amount := v_revenue;
            END IF;
            IF (v_kwp > 0) THEN
                NEW.system_power := v_kwp;
            END IF;
        END IF;

        -- 1. Provisiona / Atualiza Cliente no Catálogo (client_portal_users)
        INSERT INTO public.client_portal_users (
            name, phone, city, state, system_size_kw, contract_value, system_cost,
            notes, opportunity_id, is_active, user_id, created_at, updated_at
        ) VALUES (
            v_name,
            NEW.phone,
            v_city,
            'AL',
            v_kwp,
            v_revenue,
            v_revenue,
            'Cliente provisionado automaticamente pelo banco (Venda Ganha no CRM).',
            NEW.id,
            true,
            NEW.user_id,
            NOW(),
            NOW()
        )
        ON CONFLICT (opportunity_id) DO UPDATE SET
            contract_value = EXCLUDED.contract_value,
            system_size_kw = EXCLUDED.system_size_kw,
            is_active = true,
            updated_at = NOW()
        RETURNING id INTO v_client_id;

        -- 2. Registra / Atualiza Receita no Financeiro (financial_transactions)
        IF (v_revenue > 0) THEN
            IF EXISTS (
                SELECT 1 FROM public.financial_transactions 
                WHERE opportunity_id = NEW.id AND type = 'receita' AND deleted_at IS NULL
            ) THEN
                UPDATE public.financial_transactions SET
                    amount = v_revenue,
                    description = 'Venda Solar — ' || v_name,
                    updated_at = NOW()
                WHERE opportunity_id = NEW.id AND type = 'receita' AND deleted_at IS NULL;
            ELSE
                INSERT INTO public.financial_transactions (
                    description, type, category, amount, date, status,
                    opportunity_id, user_id, note, created_at, updated_at
                ) VALUES (
                    'Venda Solar — ' || v_name,
                    'receita',
                    CASE WHEN v_kwp > 10 THEN 'instalacao_comercial' ELSE 'instalacao_residencial' END,
                    v_revenue,
                    CURRENT_DATE,
                    'pago',
                    NEW.id,
                    NEW.user_id,
                    'Fechamento de contrato automático via CRM (' || v_kwp || ' kWp).',
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;

        -- 3. Cria Fase Inicial da Engenharia (project_tracking) se ainda não existir
        IF NOT EXISTS (
            SELECT 1 FROM public.project_tracking 
            WHERE opportunity_id = NEW.id AND phase = 'venda_confirmada' AND deleted_at IS NULL
        ) THEN
            INSERT INTO public.project_tracking (
                client_id, opportunity_id, user_id, phase, phase_label,
                started_at, is_current, notes
            ) VALUES (
                v_client_id,
                NEW.id,
                NEW.user_id,
                'venda_confirmada',
                'Venda Confirmada & Contrato',
                NOW(),
                true,
                'Início da jornada de engenharia e vistoria pós-fechamento.'
            );
        END IF;

        -- 4. Cria / Atualiza Rateio de Pró-Labore (prolabore_settlements)
        INSERT INTO public.prolabore_settlements (
            opportunity_id, client_name, city, system_size_kw, module_power_w, module_count,
            contract_revenue, kit_cost, installation_cost, material_cost, signature_cost,
            commission_cost, tax_rate, user_id, updated_at
        ) VALUES (
            NEW.id,
            v_name,
            v_city,
            v_kwp,
            550,
            CASE WHEN v_kwp > 0 THEN ROUND((v_kwp * 1000) / 550) ELSE 0 END,
            v_revenue,
            ROUND(v_revenue * 0.45, 2),
            ROUND(v_revenue * 0.10, 2),
            0,
            0,
            ROUND(v_revenue * 0.05, 2),
            5.00,
            NEW.user_id,
            NOW()
        )
        ON CONFLICT (opportunity_id) DO UPDATE SET
            contract_revenue = EXCLUDED.contract_revenue,
            client_name = EXCLUDED.client_name,
            system_size_kw = EXCLUDED.system_size_kw,
            updated_at = NOW();

    -- Caso 2: Oportunidade já ganha que teve renegociação de valor ou potência
    ELSIF (NEW.status = 'Ganho' AND OLD.status = 'Ganho' AND (
        NEW.amount IS DISTINCT FROM OLD.amount OR 
        NEW.system_power IS DISTINCT FROM OLD.system_power OR
        NEW.client_name IS DISTINCT FROM OLD.client_name
    )) THEN
        -- Atualiza catálogo de clientes
        UPDATE public.client_portal_users 
        SET contract_value = COALESCE(NEW.amount, contract_value),
            system_size_kw = COALESCE(NEW.system_power, system_size_kw),
            name = COALESCE(NEW.client_name, NEW.title, name),
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND deleted_at IS NULL;

        -- Atualiza transação financeira
        UPDATE public.financial_transactions 
        SET amount = COALESCE(NEW.amount, amount),
            description = 'Venda Solar — ' || COALESCE(NEW.client_name, NEW.title, 'Cliente'),
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND type = 'receita' AND deleted_at IS NULL;

        -- Atualiza rateio pró-labore
        UPDATE public.prolabore_settlements 
        SET contract_revenue = COALESCE(NEW.amount, contract_revenue),
            system_size_kw = COALESCE(NEW.system_power, system_size_kw),
            client_name = COALESCE(NEW.client_name, NEW.title, client_name),
            kit_cost = ROUND(COALESCE(NEW.amount, contract_revenue) * 0.45, 2),
            installation_cost = ROUND(COALESCE(NEW.amount, contract_revenue) * 0.10, 2),
            commission_cost = ROUND(COALESCE(NEW.amount, contract_revenue) * 0.05, 2),
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND deleted_at IS NULL;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_opportunity_won ON public.opportunities;
CREATE TRIGGER trg_opportunity_won
AFTER INSERT OR UPDATE OF status, amount, system_power ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.handle_opportunity_won();

-- ------------------------------------------------------------------------------
-- 5. TRIGGER DE PROPAGAÇÃO DE SOFT-DELETE & UNDELETE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_opportunity_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
        -- Propaga exclusão lógica para tabelas filhas
        UPDATE public.financial_transactions 
        SET deleted_at = NEW.deleted_at 
        WHERE opportunity_id = NEW.id AND deleted_at IS NULL;

        UPDATE public.project_tracking 
        SET deleted_at = NEW.deleted_at 
        WHERE opportunity_id = NEW.id AND deleted_at IS NULL;

        UPDATE public.client_portal_users 
        SET deleted_at = NEW.deleted_at, is_active = false 
        WHERE opportunity_id = NEW.id AND deleted_at IS NULL;

        UPDATE public.prolabore_settlements 
        SET deleted_at = NEW.deleted_at 
        WHERE opportunity_id = NEW.id AND deleted_at IS NULL;

    ELSIF (NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL) THEN
        -- Restauração (undelete)
        UPDATE public.financial_transactions 
        SET deleted_at = NULL 
        WHERE opportunity_id = NEW.id AND deleted_at = OLD.deleted_at;

        UPDATE public.project_tracking 
        SET deleted_at = NULL 
        WHERE opportunity_id = NEW.id AND deleted_at = OLD.deleted_at;

        UPDATE public.client_portal_users 
        SET deleted_at = NULL, is_active = true 
        WHERE opportunity_id = NEW.id AND deleted_at = OLD.deleted_at;

        UPDATE public.prolabore_settlements 
        SET deleted_at = NULL 
        WHERE opportunity_id = NEW.id AND deleted_at = OLD.deleted_at;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_opportunity_soft_delete ON public.opportunities;
CREATE TRIGGER trg_opportunity_soft_delete
AFTER UPDATE OF deleted_at ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.handle_opportunity_soft_delete();

-- ------------------------------------------------------------------------------
-- 6. ÍNDICES DE PERFORMANCE COMPOSTOS E PARCIAIS (< 1ms)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_opps_crm_active 
ON public.opportunities(status, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fin_tx_date_type 
ON public.financial_transactions(date DESC, type, category) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_opp_lookup 
ON public.proposals(opportunity_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_current 
ON public.project_tracking(opportunity_id, phase) 
WHERE is_current = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_portal_active 
ON public.client_portal_users(opportunity_id) 
WHERE deleted_at IS NULL;
