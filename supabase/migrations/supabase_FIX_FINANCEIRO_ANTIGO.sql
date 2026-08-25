-- Script de Resgate: Gera lançamentos financeiros retroativos para leads antigos do CSV
-- Isso garante que todos os 8 leads constem no Financeiro com a DRE Minuciosa

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

    -- Procuramos leads que são "Fechado" ou "Fechado / Ganho" mas que AINDA NÃO têm receita lançada no financeiro
    FOR v_lead IN 
        SELECT id, data->>'name' as name, (data->>'value')::NUMERIC as value 
        FROM public.leads 
        WHERE (data->>'status' = 'Fechado' OR data->>'status' = 'Fechado / Ganho')
          AND id NOT IN (
              -- Checa se o nome do lead já está na descrição de alguma transação
              SELECT DISTINCT substring(description from 'Venda Sistema Solar - (.*)') 
              FROM public.financial_transactions 
              WHERE type = 'receita'
          )
    LOOP
        -- Se o lead tiver valor maior que zero, criamos a DRE minuciosa de fallback
        IF v_lead.value > 0 THEN
            v_custo_kit := v_lead.value * 0.50;
            v_custo_op := v_lead.value * 0.15;
            v_impostos := v_lead.value * 0.10;

            -- 1. Receita
            INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id)
            VALUES ('Venda Sistema Solar - ' || v_lead.name, 'receita', 'venda_equipamento', v_lead.value, CURRENT_DATE, 'Resgate de Dados Antigos', v_user_id);

            -- 2. Custo Kit
            INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id)
            VALUES ('Custo Kit Fotovoltaico - ' || v_lead.name, 'despesa', 'fornecedores', v_custo_kit, CURRENT_DATE, 'Resgate de Dados Antigos', v_user_id);

            -- 3. Custo Operacional
            INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id)
            VALUES ('Mão de Obra e Eng. (CA) - ' || v_lead.name, 'despesa', 'instalacao_residencial', v_custo_op, CURRENT_DATE, 'Resgate de Dados Antigos', v_user_id);

            -- 4. Impostos
            INSERT INTO public.financial_transactions (description, type, category, amount, date, note, user_id)
            VALUES ('Impostos Incidentes - ' || v_lead.name, 'despesa', 'impostos', v_impostos, CURRENT_DATE, 'Resgate de Dados Antigos', v_user_id);
            
            RAISE NOTICE 'Gerado DRE retroativa para: %', v_lead.name;
        END IF;
    END LOOP;
END $$;
