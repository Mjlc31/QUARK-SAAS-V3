-- Migration: 20261105_client_portal_auto_provisioning_and_crm_sync.sql
-- Description: Garante provisionamento automático e sincronização bidirecional de CPF e credenciais do Portal do Cliente com o CRM.

-- 1. SANITIZAÇÃO DE CPF E DADOS EM CLIENT_PORTAL_USERS
CREATE OR REPLACE FUNCTION public.trg_sanitize_client_portal_users()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
    IF NEW.email = '' THEN NEW.email := NULL; END IF;
  END IF;

  IF NEW.cpf IS NOT NULL THEN
    NEW.cpf := regexp_replace(NEW.cpf, '\D', '', 'g');
    IF NEW.cpf = '' THEN NEW.cpf := NULL; END IF;
  END IF;

  IF NEW.phone IS NOT NULL THEN
    NEW.phone := trim(NEW.phone);
    IF NEW.phone = '' THEN NEW.phone := NULL; END IF;
  END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. FUNÇÃO DE PROVISIONAMENTO COM EXTENSIONS NO SEARCH_PATH
CREATE OR REPLACE FUNCTION public.provision_client_portal_user(p_client_id uuid, p_custom_password text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_client record;
  v_clean_cpf text;
  v_email text;
  v_password text;
  v_user_id uuid;
  v_existing_id uuid;
BEGIN
  -- 1. Obter dados do cliente
  SELECT * INTO v_client
  FROM public.client_portal_users
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  -- 2. Limpar CPF
  v_clean_cpf := regexp_replace(COALESCE(v_client.cpf, ''), '\D', '', 'g');
  
  -- 3. Definir e-mail
  IF v_client.email IS NOT NULL AND v_client.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    v_email := lower(trim(v_client.email));
  ELSIF length(v_clean_cpf) >= 6 THEN
    v_email := v_clean_cpf || '@cliente.quarkenergia.com.br';
  ELSE
    v_email := substring(v_client.id::text from 1 for 8) || '@cliente.quarkenergia.com.br';
  END IF;

  -- 4. Definir senha (customizada ou 6 primeiros dígitos do CPF ou padrão)
  IF p_custom_password IS NOT NULL AND length(trim(p_custom_password)) >= 6 THEN
    v_password := trim(p_custom_password);
  ELSIF length(v_clean_cpf) >= 6 THEN
    v_password := substring(v_clean_cpf from 1 for 6);
  ELSE
    v_password := 'quark2026';
  END IF;

  -- 5. Verificar se já existe auth.users com esse id ou email
  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE id = v_client.auth_user_id OR lower(email) = v_email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    v_user_id := v_existing_id;

    -- Atualiza senha e metadados no auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf', 10)),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', v_client.name, 'cpf', v_clean_cpf, 'role', 'client'),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        updated_at = now()
    WHERE id = v_user_id;

    -- Garante identity
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
      INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        v_user_id::text,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        'email',
        now(),
        now()
      );
    END IF;
  ELSE
    -- Cria novo auth_user_id
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      reauthentication_token,
      phone_change,
      phone_change_token,
      email_change_token_current,
      is_sso_user,
      is_anonymous
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_client.name, 'cpf', v_clean_cpf, 'role', 'client'),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      false,
      false
    );

    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      now(),
      now()
    );
  END IF;

  -- 6. Atualizar client_portal_users com auth_user_id, email normalizado e cpf limpo
  UPDATE public.client_portal_users
  SET auth_user_id = v_user_id,
      email = v_email,
      cpf = CASE WHEN length(v_clean_cpf) >= 6 THEN v_clean_cpf ELSE cpf END,
      is_active = COALESCE(is_active, true)
  WHERE id = p_client_id;

  RETURN jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'auth_user_id', v_user_id,
    'email', v_email,
    'password', v_password
  );
END;
$function$;

-- 3. TRIGGER AUTOMÁTICO DE PROVISIONAMENTO EM CLIENT_PORTAL_USERS
CREATE OR REPLACE FUNCTION public.trg_auto_provision_client_portal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF NEW.deleted_at IS NULL 
       AND COALESCE(NEW.is_active, true) = true 
       AND NEW.cpf IS NOT NULL 
       AND length(regexp_replace(NEW.cpf, '\D', '', 'g')) >= 6 
       AND (
           TG_OP = 'INSERT' 
           OR NEW.auth_user_id IS NULL 
           OR OLD.cpf IS DISTINCT FROM NEW.cpf 
           OR OLD.email IS DISTINCT FROM NEW.email
       ) THEN
        PERFORM public.provision_client_portal_user(NEW.id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_provision_client_portal_trigger ON public.client_portal_users;
CREATE TRIGGER trg_auto_provision_client_portal_trigger
AFTER INSERT OR UPDATE OF cpf, email, is_active, auth_user_id
ON public.client_portal_users
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_provision_client_portal();

-- 4. TRIGGER DE SINCRONIZAÇÃO EM OPPORTUNITIES PARA CLIENT_PORTAL_USERS
CREATE OR REPLACE FUNCTION public.sync_opportunity_to_client_portal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_cpf text;
    v_client_id uuid;
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    v_clean_cpf := regexp_replace(COALESCE(NEW.cpf_cnpj, ''), '\D', '', 'g');

    -- Se esta oportunidade está vinculada a um client_portal_users ativo
    UPDATE public.client_portal_users
    SET 
        cpf = CASE WHEN length(v_clean_cpf) >= 6 THEN v_clean_cpf ELSE cpf END,
        email = COALESCE(NULLIF(lower(trim(NEW.email)), ''), email),
        phone = COALESCE(NULLIF(trim(NEW.phone), ''), phone),
        name = COALESCE(NULLIF(trim(NEW.client_name), ''), NULLIF(trim(NEW.title), ''), name),
        updated_at = NOW()
    WHERE opportunity_id = NEW.id AND deleted_at IS NULL
    RETURNING id INTO v_client_id;

    -- Se encontrou e o cliente agora tem CPF, provisiona ou sincroniza no auth.users
    IF v_client_id IS NOT NULL AND length(v_clean_cpf) >= 6 THEN
        PERFORM public.provision_client_portal_user(v_client_id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_to_client_portal_trigger ON public.opportunities;
CREATE TRIGGER trg_sync_opportunity_to_client_portal_trigger
AFTER UPDATE OF cpf_cnpj, email, phone, title, client_name
ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.sync_opportunity_to_client_portal();

-- 5. ATUALIZAÇÃO DE HANDLE_OPPORTUNITY_WON PARA INCLUIR CPF E AUTO-PROVISIONAMENTO
CREATE OR REPLACE FUNCTION public.handle_opportunity_won()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_client_id UUID;
    v_kwp NUMERIC;
    v_revenue NUMERIC;
    v_name TEXT;
    v_city TEXT;
    v_clean_cpf TEXT;
    v_kit_cost NUMERIC;
    v_install_cost NUMERIC;
    v_comm_cost NUMERIC;
    v_tax_cost NUMERIC;
    v_nota_qk NUMERIC;
BEGIN
    -- Caso 1: Novo Ganho (INSERT ou transição para 'Ganho')
    IF (NEW.status = 'Ganho' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'Ganho')) THEN
        v_name := COALESCE(NEW.client_name, NEW.title, 'Cliente');
        v_city := COALESCE(NEW.city, 'Maceió');
        v_revenue := COALESCE(NEW.amount, 0);
        v_kwp := COALESCE(NEW.system_power, 0);
        v_clean_cpf := NULLIF(regexp_replace(COALESCE(NEW.cpf_cnpj, ''), '\D', '', 'g'), '');

        IF (v_revenue <= 0) THEN
            SELECT final_price, power_kwp INTO v_revenue, v_kwp
            FROM public.proposals
            WHERE (opportunity_id = NEW.id OR lead_id = NEW.id)
            ORDER BY CASE WHEN status = 'aceita' THEN 1 ELSE 2 END, created_at DESC
            LIMIT 1;
            
            v_revenue := COALESCE(v_revenue, 0);
            v_kwp := COALESCE(v_kwp, 0);
            
            IF (v_revenue > 0) THEN NEW.amount := v_revenue; END IF;
            IF (v_kwp > 0) THEN NEW.system_power := v_kwp; END IF;
        END IF;

        -- Calcula custos padrão baseados no modelo de negócio da Quark
        v_kit_cost := ROUND(v_revenue * 0.45, 2);
        v_install_cost := ROUND(v_revenue * 0.10, 2);
        v_comm_cost := ROUND(v_revenue * 0.05, 2);
        v_nota_qk := v_revenue - v_kit_cost;
        v_tax_cost := ROUND(GREATEST(0, v_nota_qk * 0.05), 2);

        -- Provisiona Catálogo de Clientes com CPF e Email normalizados
        INSERT INTO public.client_portal_users (
            name, phone, email, cpf, city, state, system_size_kw, contract_value, system_cost,
            notes, opportunity_id, is_active, user_id, created_at, updated_at
        ) VALUES (
            v_name, 
            NULLIF(trim(NEW.phone), ''), 
            NULLIF(lower(trim(NEW.email)), ''),
            v_clean_cpf,
            v_city, 
            'AL', 
            v_kwp, 
            v_revenue, 
            v_revenue,
            'Cliente provisionado automaticamente pelo banco (Venda Ganha no CRM).',
            NEW.id, 
            true, 
            COALESCE(NEW.user_id, '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid), 
            NOW(), 
            NOW()
        )
        ON CONFLICT (opportunity_id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, client_portal_users.phone),
            email = COALESCE(EXCLUDED.email, client_portal_users.email),
            cpf = COALESCE(EXCLUDED.cpf, client_portal_users.cpf),
            contract_value = EXCLUDED.contract_value,
            system_size_kw = EXCLUDED.system_size_kw,
            is_active = true,
            updated_at = NOW()
        RETURNING id INTO v_client_id;

        -- Se houver CPF, garante provisionamento imediato no Supabase Auth
        IF v_client_id IS NOT NULL AND v_clean_cpf IS NOT NULL AND length(v_clean_cpf) >= 6 THEN
            PERFORM public.provision_client_portal_user(v_client_id);
        END IF;

        -- Registra Transações no Financeiro
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
                    'Venda Solar — ' || v_name, 'receita',
                    CASE WHEN v_kwp > 10 THEN 'instalacao_comercial' ELSE 'instalacao_residencial' END,
                    v_revenue, CURRENT_DATE, 'pago', NEW.id, NEW.user_id,
                    'Fechamento de contrato automático via CRM (' || v_kwp || ' kWp).',
                    NOW(), NOW()
                );
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.financial_transactions 
                WHERE opportunity_id = NEW.id AND type = 'custo' AND category = 'equipamentos' AND deleted_at IS NULL
            ) THEN
                UPDATE public.financial_transactions SET
                    amount = v_kit_cost,
                    updated_at = NOW()
                WHERE opportunity_id = NEW.id AND type = 'custo' AND category = 'equipamentos' AND deleted_at IS NULL;
            ELSE
                INSERT INTO public.financial_transactions (
                    description, type, category, amount, date, status,
                    opportunity_id, user_id, note, created_at, updated_at
                ) VALUES (
                    'Kit Fotovoltaico e Inversores — ' || v_name, 'custo', 'equipamentos',
                    v_kit_cost, CURRENT_DATE, 'pago', NEW.id, NEW.user_id,
                    'Custo direto de equipamentos e painéis (45% do contrato).', NOW(), NOW()
                );
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.financial_transactions 
                WHERE opportunity_id = NEW.id AND type = 'custo' AND category = 'mao_de_obra' AND deleted_at IS NULL
            ) THEN
                UPDATE public.financial_transactions SET
                    amount = v_install_cost,
                    updated_at = NOW()
                WHERE opportunity_id = NEW.id AND type = 'custo' AND category = 'mao_de_obra' AND deleted_at IS NULL;
            ELSE
                INSERT INTO public.financial_transactions (
                    description, type, category, amount, date, status,
                    opportunity_id, user_id, note, created_at, updated_at
                ) VALUES (
                    'Instalação e Montagem — ' || v_name, 'custo', 'mao_de_obra',
                    v_install_cost, CURRENT_DATE, 'pago', NEW.id, NEW.user_id,
                    'Mão de obra e equipe técnica de instalação (10% do contrato).', NOW(), NOW()
                );
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.financial_transactions 
                WHERE opportunity_id = NEW.id AND type = 'despesa' AND category = 'salarios' AND deleted_at IS NULL
            ) THEN
                UPDATE public.financial_transactions SET
                    amount = v_comm_cost,
                    updated_at = NOW()
                WHERE opportunity_id = NEW.id AND type = 'despesa' AND category = 'salarios' AND deleted_at IS NULL;
            ELSE
                INSERT INTO public.financial_transactions (
                    description, type, category, amount, date, status,
                    opportunity_id, user_id, note, created_at, updated_at
                ) VALUES (
                    'Comissão de Venda — ' || v_name, 'despesa', 'salarios',
                    v_comm_cost, CURRENT_DATE, 'pago', NEW.id, NEW.user_id,
                    'Comissão comercial do consultor de vendas (5% do contrato).', NOW(), NOW()
                );
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.financial_transactions 
                WHERE opportunity_id = NEW.id AND type = 'despesa' AND category = 'imposto' AND deleted_at IS NULL
            ) THEN
                UPDATE public.financial_transactions SET
                    amount = v_tax_cost,
                    updated_at = NOW()
                WHERE opportunity_id = NEW.id AND type = 'despesa' AND category = 'imposto' AND deleted_at IS NULL;
            ELSE
                INSERT INTO public.financial_transactions (
                    description, type, category, amount, date, status,
                    opportunity_id, user_id, note, created_at, updated_at
                ) VALUES (
                    'Impostos Incidentes (Nota QK) — ' || v_name, 'despesa', 'imposto',
                    v_tax_cost, CURRENT_DATE, 'pago', NEW.id, NEW.user_id,
                    'Imposto sobre nota fiscal de serviço Quark (5% sobre Nota QK).', NOW(), NOW()
                );
            END IF;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.project_tracking 
            WHERE opportunity_id = NEW.id AND phase = 'venda_confirmada' AND deleted_at IS NULL
        ) THEN
            INSERT INTO public.project_tracking (
                client_id, opportunity_id, user_id, phase, phase_label,
                started_at, is_current, notes
            ) VALUES (
                v_client_id, NEW.id, NEW.user_id, 'venda_confirmada',
                'Venda Confirmada & Contrato', NOW(), true,
                'Início da jornada de engenharia e vistoria pós-fechamento.'
            );
        END IF;

        INSERT INTO public.prolabore_settlements (
            opportunity_id, client_name, city, system_size_kw, module_power_w, module_count,
            contract_revenue, kit_cost, installation_cost, material_cost, signature_cost,
            commission_cost, tax_rate, settlement_date, user_id, updated_at
        ) VALUES (
            NEW.id, v_name, v_city, v_kwp, 550,
            CASE WHEN v_kwp > 0 THEN ROUND((v_kwp * 1000) / 550) ELSE 0 END,
            v_revenue, v_kit_cost, v_install_cost,
            0, 0, v_comm_cost, 5.00, CURRENT_DATE, NEW.user_id, NOW()
        )
        ON CONFLICT (opportunity_id) DO UPDATE SET
            contract_revenue = EXCLUDED.contract_revenue,
            client_name = EXCLUDED.client_name,
            system_size_kw = EXCLUDED.system_size_kw,
            kit_cost = EXCLUDED.kit_cost,
            installation_cost = EXCLUDED.installation_cost,
            commission_cost = EXCLUDED.commission_cost,
            settlement_date = COALESCE(EXCLUDED.settlement_date, public.prolabore_settlements.settlement_date, CURRENT_DATE),
            updated_at = NOW();

    -- Caso 2: Renegociação ou atualização de dados de oportunidade Ganha
    ELSIF (NEW.status = 'Ganho' AND OLD.status = 'Ganho' AND (
        NEW.amount IS DISTINCT FROM OLD.amount OR 
        NEW.system_power IS DISTINCT FROM OLD.system_power OR
        NEW.client_name IS DISTINCT FROM OLD.client_name OR
        NEW.cpf_cnpj IS DISTINCT FROM OLD.cpf_cnpj OR
        NEW.email IS DISTINCT FROM OLD.email OR
        NEW.phone IS DISTINCT FROM OLD.phone
    )) THEN
        v_name := COALESCE(NEW.client_name, NEW.title, 'Cliente');
        v_revenue := COALESCE(NEW.amount, 0);
        v_clean_cpf := NULLIF(regexp_replace(COALESCE(NEW.cpf_cnpj, ''), '\D', '', 'g'), '');
        v_kit_cost := ROUND(v_revenue * 0.45, 2);
        v_install_cost := ROUND(v_revenue * 0.10, 2);
        v_comm_cost := ROUND(v_revenue * 0.05, 2);
        v_nota_qk := v_revenue - v_kit_cost;
        v_tax_cost := ROUND(GREATEST(0, v_nota_qk * 0.05), 2);

        UPDATE public.client_portal_users 
        SET contract_value = COALESCE(NEW.amount, contract_value),
            system_size_kw = COALESCE(NEW.system_power, system_size_kw),
            name = COALESCE(NEW.client_name, NEW.title, name),
            cpf = COALESCE(v_clean_cpf, cpf),
            email = COALESCE(NULLIF(lower(trim(NEW.email)), ''), email),
            phone = COALESCE(NULLIF(trim(NEW.phone), ''), phone),
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND deleted_at IS NULL
        RETURNING id INTO v_client_id;

        IF v_client_id IS NOT NULL AND v_clean_cpf IS NOT NULL AND length(v_clean_cpf) >= 6 THEN
            PERFORM public.provision_client_portal_user(v_client_id);
        END IF;

        UPDATE public.financial_transactions 
        SET amount = v_revenue,
            description = 'Venda Solar — ' || v_name,
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND type = 'receita' AND deleted_at IS NULL;

        UPDATE public.financial_transactions 
        SET amount = v_kit_cost,
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND type = 'custo' AND category = 'equipamentos' AND deleted_at IS NULL;

        UPDATE public.financial_transactions 
        SET amount = v_install_cost,
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND type = 'custo' AND category = 'mao_de_obra' AND deleted_at IS NULL;

        UPDATE public.financial_transactions 
        SET amount = v_comm_cost,
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND type = 'despesa' AND category = 'salarios' AND deleted_at IS NULL;

        UPDATE public.financial_transactions 
        SET amount = v_tax_cost,
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND type = 'despesa' AND category = 'imposto' AND deleted_at IS NULL;

        UPDATE public.prolabore_settlements 
        SET contract_revenue = v_revenue,
            system_size_kw = COALESCE(NEW.system_power, system_size_kw),
            client_name = v_name,
            kit_cost = v_kit_cost,
            installation_cost = v_install_cost,
            commission_cost = v_comm_cost,
            updated_at = NOW()
        WHERE opportunity_id = NEW.id AND deleted_at IS NULL;

    END IF;
    RETURN NEW;
END;
$function$;

-- 6. RPC GET_CLIENT_AUTH_EMAIL COM RECONCILIAÇÃO E AUTO-PROVISIONAMENTO NO LOGIN
CREATE OR REPLACE FUNCTION public.get_client_auth_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_doc text;
    v_email text;
    v_full_cpf text;
    v_client_id uuid;
    v_auth_id uuid;
    v_opp_id uuid;
    v_opp_name text;
    v_opp_phone text;
    v_opp_email text;
BEGIN
    IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
        RETURN NULL;
    END IF;

    IF p_identifier LIKE '%@%' THEN
        RETURN lower(trim(p_identifier));
    END IF;

    v_clean_doc := regexp_replace(p_identifier, '\D', '', 'g');

    IF v_clean_doc = '' THEN
        RETURN NULL;
    END IF;

    -- 1. Busca em client_portal_users (exato ou pelos 6 primeiros dígitos)
    SELECT id, auth_user_id, lower(trim(email)), regexp_replace(COALESCE(cpf, ''), '\D', '', 'g')
    INTO v_client_id, v_auth_id, v_email, v_full_cpf
    FROM public.client_portal_users
    WHERE (
        regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = v_clean_doc
        OR (length(v_clean_doc) >= 6 AND regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') LIKE v_clean_doc || '%')
    )
    AND deleted_at IS NULL
    ORDER BY (auth_user_id IS NOT NULL) DESC, created_at DESC
    LIMIT 1;

    -- Se encontrou mas ainda não tinha auth_user_id
    IF v_client_id IS NOT NULL AND v_auth_id IS NULL THEN
        PERFORM public.provision_client_portal_user(v_client_id);
        SELECT lower(trim(email)) INTO v_email FROM public.client_portal_users WHERE id = v_client_id;
    END IF;

    -- 2. Se não encontrou em client_portal_users, busca no CRM (opportunities)
    IF v_client_id IS NULL AND length(v_clean_doc) >= 6 THEN
        SELECT id, COALESCE(client_name, title), phone, lower(trim(email)), regexp_replace(COALESCE(cpf_cnpj, ''), '\D', '', 'g')
        INTO v_opp_id, v_opp_name, v_opp_phone, v_opp_email, v_full_cpf
        FROM public.opportunities
        WHERE (
            regexp_replace(COALESCE(cpf_cnpj, ''), '\D', '', 'g') = v_clean_doc
            OR (length(v_clean_doc) >= 6 AND regexp_replace(COALESCE(cpf_cnpj, ''), '\D', '', 'g') LIKE v_clean_doc || '%')
        )
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_opp_id IS NOT NULL THEN
            INSERT INTO public.client_portal_users (
                opportunity_id,
                name,
                cpf,
                email,
                phone,
                city,
                state,
                is_active,
                notes,
                created_at,
                updated_at
            ) VALUES (
                v_opp_id,
                COALESCE(v_opp_name, 'Cliente Quark'),
                v_full_cpf,
                v_opp_email,
                v_opp_phone,
                'Maceió',
                'AL',
                true,
                'Provisionado dinamicamente no login do Portal.',
                NOW(),
                NOW()
            )
            ON CONFLICT (opportunity_id) DO UPDATE SET
                cpf = EXCLUDED.cpf,
                email = COALESCE(EXCLUDED.email, client_portal_users.email),
                is_active = true,
                updated_at = NOW()
            RETURNING id INTO v_client_id;

            IF v_client_id IS NOT NULL THEN
                PERFORM public.provision_client_portal_user(v_client_id);
                SELECT lower(trim(email)) INTO v_email FROM public.client_portal_users WHERE id = v_client_id;
            END IF;
        END IF;
    END IF;

    IF v_email IS NULL OR v_email = '' THEN
        IF v_full_cpf IS NOT NULL AND length(v_full_cpf) >= 6 THEN
            RETURN v_full_cpf || '@cliente.quarkenergia.com.br';
        ELSIF length(v_clean_doc) >= 6 THEN
            RETURN v_clean_doc || '@cliente.quarkenergia.com.br';
        END IF;
    END IF;

    RETURN v_email;
END;
$$;
