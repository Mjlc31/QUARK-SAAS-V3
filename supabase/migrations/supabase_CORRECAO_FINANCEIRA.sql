-- Script de Correção: Ajusta as categorias erradas e adiciona as despesas faltantes
-- Para que os cálculos da DRE (Financeiro.tsx) funcionem perfeitamente.

DO $$ 
DECLARE
    v_lead record;
    v_user_id UUID;
    v_custo_kit NUMERIC;
    v_custo_op NUMERIC;
    v_impostos NUMERIC;
BEGIN
    -- Pegamos o ID do primeiro usuário admin para vincular os lançamentos
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- 1. CORRIGIR CATEGORIAS ERRADAS DOS LANÇAMENTOS EXISTENTES
    -- Corrigir receitas (venda_equipamento -> instalacao_residencial)
    UPDATE public.financial_transactions
    SET category = 'instalacao_residencial'
    WHERE type = 'receita' AND category = 'venda_equipamento';

    -- Corrigir custo do kit (fornecedores -> equipamentos e type -> custo)
    UPDATE public.financial_transactions
    SET type = 'custo', category = 'equipamentos'
    WHERE category = 'fornecedores' AND description LIKE 'Custo Kit Fotovoltaico%';

    -- Corrigir custo de mão de obra (instalacao_residencial -> mao_de_obra e type -> custo)
    UPDATE public.financial_transactions
    SET type = 'custo', category = 'mao_de_obra'
    WHERE description LIKE 'Mão de Obra e Eng. (CA)%';

    -- Corrigir impostos (impostos -> imposto)
    UPDATE public.financial_transactions
    SET category = 'imposto'
    WHERE category = 'impostos' AND description LIKE 'Impostos Incidentes%';

    -- 2. GERAR DESPESAS FALTANTES PARA OS 5 LEADS QUE SÓ TIVERAM A RECEITA GERADA (Lançamentos Automáticos Antigos)
    FOR v_lead IN 
        SELECT id, data->>'name' as name, (data->>'value')::NUMERIC as value 
        FROM public.leads 
        WHERE (data->>'status' = 'Fechado' OR data->>'status' = 'Fechado / Ganho')
          AND data->>'value' IS NOT NULL
          AND (data->>'value')::NUMERIC > 0
          -- Verifica se TEM receita
          AND id IN (
              SELECT l.id FROM public.leads l
              JOIN public.financial_transactions ft ON ft.description = 'Venda Sistema Solar - ' || (l.data->>'name')
              WHERE ft.type = 'receita'
          )
          -- MAS NÃO TEM custo de kit (ou seja, foi gerado antes do update das despesas)
          AND id NOT IN (
              SELECT l.id FROM public.leads l
              JOIN public.financial_transactions ft ON ft.description = 'Custo Kit Fotovoltaico - ' || (l.data->>'name')
          )
    LOOP
        v_custo_kit := v_lead.value * 0.50;
        v_custo_op := v_lead.value * 0.15;
        v_impostos := v_lead.value * 0.10;

        -- 2. Custo Kit
        INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id)
        VALUES ('Custo Kit Fotovoltaico - ' || v_lead.name, 'custo', 'equipamentos', v_custo_kit, CURRENT_DATE, 'Correção de Despesas Faltantes', v_user_id);

        -- 3. Custo Operacional
        INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id)
        VALUES ('Mão de Obra e Eng. (CA) - ' || v_lead.name, 'custo', 'mao_de_obra', v_custo_op, CURRENT_DATE, 'Correção de Despesas Faltantes', v_user_id);

        -- 4. Impostos
        INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id)
        VALUES ('Impostos Incidentes - ' || v_lead.name, 'despesa', 'imposto', v_impostos, CURRENT_DATE, 'Correção de Despesas Faltantes', v_user_id);
        
        RAISE NOTICE 'Geradas despesas faltantes para: %', v_lead.name;
    END LOOP;
END $$;
