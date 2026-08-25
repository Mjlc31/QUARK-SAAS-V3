-- ==========================================
-- PURGE v2: Completa os 8 Leads que Faltaram
-- ==========================================
-- O script anterior só pegou 3 leads (os dragged manualmente).
-- Este script usa a tabela lead_pipelines para encontrar os demais.

DO $$ 
DECLARE
    v_lead record;
    v_user_id UUID;
    v_custo_kit NUMERIC;
    v_custo_op NUMERIC;
    v_impostos NUMERIC;
    v_engenharia NUMERIC;
    v_frete NUMERIC;
    v_comissao NUMERIC;
BEGIN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- ==========================================
    -- FASE 1: PURGE COMPLETO (sem deixar rastro)
    -- ==========================================
    DELETE FROM public.financial_transactions
    WHERE description LIKE 'Venda Sistema Solar - %'
       OR description LIKE 'Kit Fotovoltaico e Inversores - %'
       OR description LIKE 'Instalação e Montagem - %'
       OR description LIKE 'Impostos Incidentes%'
       OR description LIKE 'Projeto e Homologação%'
       OR description LIKE 'Frete de Equipamentos - %'
       OR description LIKE 'Comissão do Vendedor - %'
       OR description LIKE 'Custo Kit Fotovoltaico - %'
       OR description LIKE 'Mão de Obra e Eng.%';

    RAISE NOTICE 'PURGE COMPLETO.';

    -- ==========================================
    -- FASE 2: REBIRTH usando lead_pipelines
    -- ==========================================
    -- Pega todos os leads que têm stage = 'Fechado' na tabela de pipelines
    -- OU que têm status = 'Fechado' / 'Fechado / Ganho' no campo data
    FOR v_lead IN 
        SELECT DISTINCT ON (l.id)
            l.id,
            COALESCE(l.data->>'name', 'Sem Nome') as name,
            COALESCE((l.data->>'value')::NUMERIC, 0) as value
        FROM public.leads l
        WHERE (
            -- Via pipelineEntries (leads dragged manualmente no Kanban)
            l.data->'pipelineEntries' @> '[{"stage":"Fechado"}]'
            OR
            -- Via status legado (leads importados do CSV / backup)
            l.data->>'status' IN ('Fechado', 'Fechado / Ganho')
            OR
            -- Via tabela lead_pipelines (mais confiável)
            l.id IN (
                SELECT lead_id FROM public.lead_pipelines WHERE stage = 'Fechado'
            )
        )
        AND COALESCE((l.data->>'value')::NUMERIC, 0) > 0
    LOOP
        v_custo_kit := v_lead.value * 0.45;
        v_custo_op := v_lead.value * 0.10;
        v_impostos := v_lead.value * 0.10;
        v_engenharia := v_lead.value * 0.03;
        v_frete := v_lead.value * 0.02;
        v_comissao := v_lead.value * 0.05;

        INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id) VALUES
            ('Venda Sistema Solar - ' || v_lead.name, 'receita', 'instalacao_residencial', v_lead.value, CURRENT_DATE, 'Geração Automática (DRE)', v_user_id),
            ('Kit Fotovoltaico e Inversores - ' || v_lead.name, 'custo', 'equipamentos', v_custo_kit, CURRENT_DATE, 'Estimativa Padrão (45%)', v_user_id),
            ('Instalação e Montagem - ' || v_lead.name, 'custo', 'mao_de_obra', v_custo_op, CURRENT_DATE, 'Estimativa Padrão (10%)', v_user_id),
            ('Impostos Incidentes (DAS/ICMS) - ' || v_lead.name, 'despesa', 'imposto', v_impostos, CURRENT_DATE, 'Estimativa Padrão (10%)', v_user_id),
            ('Projeto e Homologação na Concessionária - ' || v_lead.name, 'custo', 'outros_cpv', v_engenharia, CURRENT_DATE, 'Estimativa Padrão (3%)', v_user_id),
            ('Frete de Equipamentos - ' || v_lead.name, 'custo', 'frete', v_frete, CURRENT_DATE, 'Estimativa Padrão (2%)', v_user_id),
            ('Comissão do Vendedor - ' || v_lead.name, 'despesa', 'salarios', v_comissao, CURRENT_DATE, 'Estimativa Padrão (5%)', v_user_id);

        RAISE NOTICE 'DRE gerada para: % (R$ %)', v_lead.name, v_lead.value;
    END LOOP;

    RAISE NOTICE '✅ OPERAÇÃO CONCLUÍDA COM SUCESSO!';
END $$;

-- Verificação: quantos leads e lançamentos foram gerados
SELECT 
    'Leads Fechados Encontrados' as info,
    COUNT(DISTINCT CASE WHEN description LIKE 'Venda Sistema Solar - %' THEN id END) as leads_com_receita,
    COUNT(*) as total_lancamentos
FROM public.financial_transactions
WHERE description LIKE 'Venda Sistema Solar - %'
   OR description LIKE 'Kit Fotovoltaico e Inversores - %';
