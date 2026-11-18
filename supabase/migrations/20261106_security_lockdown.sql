-- Migration: 20261106_security_lockdown.sql
-- Fecha o acesso anônimo/irrestrito às tabelas, corrige escalonamento de privilégio
-- e o takeover de contas via provisionamento do Portal do Cliente.
-- Rollback: supabase/rollback/20261106_security_lockdown_rollback.sql

-- ═══ 1. POLICIES ════════════════════════════════════════════════════════════

-- 1a. Anon com acesso total (a anon key é pública): remover
DROP POLICY IF EXISTS backend_anon_access_client_intelligence ON public.client_intelligence;
DROP POLICY IF EXISTS backend_anon_access_client_portal_users ON public.client_portal_users;
DROP POLICY IF EXISTS financial_anon_all ON public.financial_transactions;
DROP POLICY IF EXISTS leads_anon_all ON public.leads;
DROP POLICY IF EXISTS maintenance_services_anon_all ON public.maintenance_services;
DROP POLICY IF EXISTS opportunities_anon_all ON public.opportunities;
DROP POLICY IF EXISTS backend_anon_access_project_tracking ON public.project_tracking;
DROP POLICY IF EXISTS receipts_anon_read ON public.receipts;
DROP POLICY IF EXISTS support_tickets_anon_all ON public.support_tickets;
DROP POLICY IF EXISTS tasks_anon_all ON public.tasks;
DROP POLICY IF EXISTS ticket_messages_anon_all ON public.ticket_messages;
DROP POLICY IF EXISTS backend_anon_access_utility_invoices ON public.utility_invoices;
DROP POLICY IF EXISTS proposals_all_access ON public.proposals; -- proposta pública usa a RPC get_public_proposal

-- 1b. SELECT liberado para qualquer papel (inclusive anon) só por deleted_at IS NULL
DROP POLICY IF EXISTS opportunities_read_active ON public.opportunities;
DROP POLICY IF EXISTS leads_read_active ON public.leads;
DROP POLICY IF EXISTS client_portal_users_read_active ON public.client_portal_users;

-- 1c. "authenticated USING (true)": clientes do portal também são authenticated.
--     Tabelas que já têm *_team_access (is_team_member) perdem só a policy redundante.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['activities','document_signers','documents','financial','lead_pipelines','lead_tags','leads',
    'maintenance_alerts','maintenance_services','opportunities','pipelines','products','projects','proposals',
    'support_tickets','tags','tasks','ticket_messages','utility_invoices']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      'quark_' || t || '_auth', CASE t WHEN 'financial' THEN 'financial_transactions' ELSE t END);
  END LOOP;
END $$;
DROP POLICY IF EXISTS quark_profiles_auth ON public.profiles;

--     Tabelas sem policy de equipe: restringe à equipe em vez de remover
ALTER POLICY quark_team_access_client_intelligence ON public.client_intelligence USING (public.is_team_member()) WITH CHECK (public.is_team_member());
ALTER POLICY quark_team_access_client_portal_users ON public.client_portal_users USING (public.is_team_member()) WITH CHECK (public.is_team_member());
ALTER POLICY quark_receipts_auth ON public.receipts USING (public.is_team_member()) WITH CHECK (public.is_team_member());
ALTER POLICY profiles_team_select ON public.profiles USING (public.is_team_member());

-- 1d. Policies "public USING (true)" (valiam para anon)
ALTER POLICY prolabore_all ON public.prolabore_settlements TO authenticated USING (public.is_team_member()) WITH CHECK (public.is_team_member());
ALTER POLICY social_accounts_all ON public.social_accounts TO authenticated USING (public.is_team_member()) WITH CHECK (public.is_team_member());
ALTER POLICY social_posts_all ON public.social_posts TO authenticated USING (public.is_team_member()) WITH CHECK (public.is_team_member());

-- 1e. Brechas pontuais
-- client_portal_users_tenant_access tinha "OR auth.role() = 'authenticated'" (todo cliente via todos)
ALTER POLICY client_portal_users_tenant_access ON public.client_portal_users
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
-- documentos sem dono (user_id NULL) eram visíveis a qualquer authenticated
ALTER POLICY documents_auth_all ON public.documents
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY document_signers_auth_all ON public.document_signers
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_signers.document_id AND d.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_signers.document_id AND d.user_id = (SELECT auth.uid())));

-- 1f. Loja do portal: cliente autenticado só lê o catálogo
DROP POLICY IF EXISTS products_portal_read ON public.products;
CREATE POLICY products_portal_read ON public.products FOR SELECT TO authenticated USING (deleted_at IS NULL);

-- ═══ 2. ESCALONAMENTO DE PRIVILÉGIO ═════════════════════════════════════════

-- user_metadata é editável pelo próprio usuário (auth.updateUser / signUp) → não pode conceder admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    COALESCE((auth.jwt() ->> 'email') IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com'), false)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role ILIKE '%admin%' OR email IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com'))
    )
  );
END;
$function$;

-- Todo cadastro novo nasce como 'client'; equipe é promovida por admin em profiles.role
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        'client'
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;
    RETURN new;
END;
$function$;

-- Só admin altera profiles.role (profiles_update deixa o usuário editar a própria linha)
CREATE OR REPLACE FUNCTION public.guard_profile_role()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
CREATE TRIGGER trg_guard_profile_role BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

-- Cliente pode editar o próprio perfil, mas não pontos, vínculo, CPF, e-mail, fase etc.
-- INVOKER de propósito: dentro de funções SECURITY DEFINER (ex.: redeem_quark_points) current_user é o dono.
CREATE OR REPLACE FUNCTION public.guard_client_portal_users()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_team_member() THEN
    NEW.quark_points        := OLD.quark_points;
    NEW.is_active           := OLD.is_active;
    NEW.auth_user_id        := OLD.auth_user_id;
    NEW.user_id             := OLD.user_id;
    NEW.cpf                 := OLD.cpf;
    NEW.email               := OLD.email;
    NEW.opportunity_id      := OLD.opportunity_id;
    NEW.lead_id             := OLD.lead_id;
    NEW.project_phase       := OLD.project_phase;
    NEW.project_phase_label := OLD.project_phase_label;
    NEW.deleted_at          := OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_guard_client_portal_users ON public.client_portal_users;
CREATE TRIGGER trg_guard_client_portal_users BEFORE UPDATE ON public.client_portal_users
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_portal_users();

-- DRE: antes, p_user_id NULL = visão completa para qualquer chamador
CREATE OR REPLACE FUNCTION public.get_financial_dre_summary(p_user_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_dre JSONB;
    v_is_admin BOOLEAN := public.is_team_member() OR auth.role() = 'service_role';
BEGIN
    IF NOT v_is_admin THEN
        p_user_id := auth.uid();
    END IF;

    SELECT jsonb_build_object(
        'receita_bruta', COALESCE(SUM(amount) FILTER (WHERE type = 'receita'), 0),
        'rec_residencial', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category = 'instalacao_residencial'), 0),
        'rec_comercial', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category = 'instalacao_comercial'), 0),
        'rec_manutencao', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category = 'manutencao'), 0),
        'rec_outros', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category NOT IN ('instalacao_residencial', 'instalacao_comercial', 'manutencao')), 0),
        'cpv_equipamentos', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'equipamentos'), 0),
        'cpv_mao_obra', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'mao_de_obra'), 0),
        'cpv_frete', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'frete'), 0),
        'cpv_outros', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category NOT IN ('equipamentos', 'mao_de_obra', 'frete')), 0),
        'desp_salarios', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'salarios'), 0),
        'desp_marketing', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'marketing'), 0),
        'desp_aluguel', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'aluguel'), 0),
        'desp_combustivel', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'combustivel'), 0),
        'desp_software', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'software'), 0),
        'desp_outras', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category NOT IN ('salarios', 'marketing', 'aluguel', 'combustivel', 'software', 'imposto')), 0),
        'impostos', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'imposto'), 0),
        'total_receita', COALESCE(SUM(amount) FILTER (WHERE type = 'receita'), 0),
        'total_custo', COALESCE(SUM(amount) FILTER (WHERE type = 'custo'), 0),
        'total_despesa', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa'), 0),
        'count_receita', COUNT(*) FILTER (WHERE type = 'receita'),
        'count_custo', COUNT(*) FILTER (WHERE type = 'custo'),
        'count_despesa', COUNT(*) FILTER (WHERE type = 'despesa')
    ) INTO v_dre
    FROM public.financial_transactions
    WHERE deleted_at IS NULL
      AND ((v_is_admin AND p_user_id IS NULL) OR user_id = p_user_id)
      AND (p_start_date IS NULL OR date >= p_start_date)
      AND (p_end_date IS NULL OR date <= p_end_date);

    RETURN v_dre;
END;
$function$;

-- ═══ 3. PROVISIONAMENTO DO PORTAL (takeover de contas) ══════════════════════

-- Interna, sem grant para anon/authenticated. Regras:
--  • já vinculado → nunca troca senha, salvo reset explícito (p_custom_password)
--  • e-mail já existente em auth.users → só reaproveita conta 'client' sem outro vínculo, sem trocar senha
CREATE OR REPLACE FUNCTION public._provision_client_portal_user(p_client_id uuid, p_custom_password text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_client record;
  v_clean_cpf text;
  v_email text;
  v_password text;
  v_user_id uuid;
  v_created boolean := false;
  v_custom text := NULLIF(trim(COALESCE(p_custom_password, '')), '');
BEGIN
  SELECT * INTO v_client FROM public.client_portal_users WHERE id = p_client_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;
  IF v_custom IS NOT NULL AND length(v_custom) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A senha deve ter ao menos 6 caracteres');
  END IF;

  v_clean_cpf := regexp_replace(COALESCE(v_client.cpf, ''), '\D', '', 'g');

  IF v_client.auth_user_id IS NOT NULL THEN
    SELECT id, lower(email) INTO v_user_id, v_email FROM auth.users WHERE id = v_client.auth_user_id;
  END IF;

  IF v_user_id IS NOT NULL THEN
    IF v_custom IS NOT NULL THEN
      UPDATE auth.users SET encrypted_password = crypt(v_custom, gen_salt('bf', 10)), updated_at = now() WHERE id = v_user_id;
      v_password := v_custom;
    END IF;
  ELSE
    IF v_client.email IS NOT NULL AND v_client.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      v_email := lower(trim(v_client.email));
    ELSIF length(v_clean_cpf) >= 6 THEN
      v_email := v_clean_cpf || '@cliente.quarkenergia.com.br';
    ELSE
      v_email := substring(v_client.id::text from 1 for 8) || '@cliente.quarkenergia.com.br';
    END IF;

    SELECT u.id INTO v_user_id FROM auth.users u WHERE lower(u.email) = v_email LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user_id AND p.role = 'client')
         OR EXISTS (SELECT 1 FROM public.client_portal_users c WHERE c.auth_user_id = v_user_id AND c.id <> p_client_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'E-mail já pertence a outra conta');
      END IF;
    ELSE
      v_password := COALESCE(v_custom, CASE WHEN length(v_clean_cpf) >= 6 THEN substring(v_clean_cpf from 1 for 6) ELSE 'quark2026' END);
      v_user_id := gen_random_uuid();
      v_created := true;

      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change, reauthentication_token,
        phone_change, phone_change_token, email_change_token_current, is_sso_user, is_anonymous
      ) VALUES (
        v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
        crypt(v_password, gen_salt('bf', 10)), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', v_client.name, 'cpf', v_clean_cpf, 'role', 'client'),
        now(), now(), '', '', '', '', '', '', '', '', false, false
      );

      INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
      VALUES (gen_random_uuid(), v_user_id::text, v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true), 'email', now(), now());
    END IF;

    UPDATE public.client_portal_users
    SET auth_user_id = v_user_id,
        email = v_email,
        cpf = CASE WHEN length(v_clean_cpf) >= 6 THEN v_clean_cpf ELSE cpf END,
        is_active = COALESCE(is_active, true)
    WHERE id = p_client_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'auth_user_id', v_user_id,
    'email', v_email,
    'created', v_created,
    'password', v_password  -- só preenchida na criação ou em reset explícito
  );
END;
$function$;

-- Wrapper público: só equipe (ou service_role)
CREATE OR REPLACE FUNCTION public.provision_client_portal_user(p_client_id uuid, p_custom_password text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_team_member() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN public._provision_client_portal_user(p_client_id, p_custom_password);
END;
$function$;

-- Trigger: provisiona apenas quem ainda não tem conta (antes resetava a senha a cada edição de CPF/e-mail)
CREATE OR REPLACE FUNCTION public.trg_auto_provision_client_portal()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF NEW.auth_user_id IS NULL
       AND NEW.deleted_at IS NULL
       AND COALESCE(NEW.is_active, true) = true
       AND length(regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g')) >= 6 THEN
        PERFORM public._provision_client_portal_user(NEW.id, NULL);
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_opportunity_to_client_portal()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_clean_cpf text;
    v_client_id uuid;
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    v_clean_cpf := regexp_replace(COALESCE(NEW.cpf_cnpj, ''), '\D', '', 'g');

    UPDATE public.client_portal_users
    SET
        cpf = CASE WHEN length(v_clean_cpf) >= 6 THEN v_clean_cpf ELSE cpf END,
        email = COALESCE(NULLIF(lower(trim(NEW.email)), ''), email),
        phone = COALESCE(NULLIF(trim(NEW.phone), ''), phone),
        name = COALESCE(NULLIF(trim(NEW.client_name), ''), NULLIF(trim(NEW.title), ''), name),
        updated_at = NOW()
    WHERE opportunity_id = NEW.id AND deleted_at IS NULL
    RETURNING id INTO v_client_id;

    IF v_client_id IS NOT NULL AND length(v_clean_cpf) >= 6 THEN
        PERFORM public._provision_client_portal_user(v_client_id, NULL);
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_auth_email(p_identifier text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
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

    IF v_client_id IS NOT NULL AND v_auth_id IS NULL THEN
        PERFORM public._provision_client_portal_user(v_client_id, NULL);
        SELECT lower(trim(email)) INTO v_email FROM public.client_portal_users WHERE id = v_client_id;
    END IF;

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
                opportunity_id, name, cpf, email, phone, city, state, is_active, notes, created_at, updated_at
            ) VALUES (
                v_opp_id, COALESCE(v_opp_name, 'Cliente Quark'), v_full_cpf, v_opp_email, v_opp_phone,
                'Maceió', 'AL', true, 'Provisionado dinamicamente no login do Portal.', NOW(), NOW()
            )
            ON CONFLICT (opportunity_id) DO UPDATE SET
                cpf = EXCLUDED.cpf,
                email = COALESCE(EXCLUDED.email, client_portal_users.email),
                is_active = true,
                updated_at = NOW()
            RETURNING id INTO v_client_id;

            IF v_client_id IS NOT NULL THEN
                PERFORM public._provision_client_portal_user(v_client_id, NULL);
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
$function$;

CREATE OR REPLACE FUNCTION public.provision_all_client_portal_users()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rec record;
  v_count integer := 0;
  v_res jsonb;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role' OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  FOR v_rec IN
    SELECT id FROM public.client_portal_users
    WHERE auth_user_id IS NULL AND cpf IS NOT NULL AND length(regexp_replace(cpf, '\D', '', 'g')) >= 6
  LOOP
    v_res := public._provision_client_portal_user(v_rec.id, NULL);
    IF (v_res->>'success')::boolean THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'total_provisioned', v_count);
END;
$function$;

-- Vínculo pós-signUp do portal: só a própria conta recém-criada, sem sequestrar perfil já vinculado
CREATE OR REPLACE FUNCTION public.link_client_portal_user(p_auth_id uuid, p_cpf text, p_name text, p_email text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_clean_cpf TEXT;
    v_existing_id UUID;
    v_existing_auth UUID;
    v_opp_id UUID;
    v_phone TEXT;
    v_owner_user_id UUID;
    v_auth_email TEXT;
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_auth_id THEN
        RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;

    SELECT lower(email) INTO v_auth_email FROM auth.users
    WHERE id = p_auth_id AND created_at > now() - interval '30 minutes';
    IF v_auth_email IS NULL THEN
        RAISE EXCEPTION 'Conta inválida para vínculo' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_auth_id AND role = 'client') THEN
        RAISE EXCEPTION 'Conta inválida para vínculo' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.client_portal_users WHERE auth_user_id = p_auth_id) THEN
        RETURN TRUE;
    END IF;

    v_clean_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');

    SELECT id, phone, user_id INTO v_opp_id, v_phone, v_owner_user_id
    FROM public.opportunities
    WHERE regexp_replace(COALESCE(cpf_cnpj, ''), '[^0-9]', '', 'g') = v_clean_cpf
      AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 1;

    SELECT id, auth_user_id INTO v_existing_id, v_existing_auth
    FROM public.client_portal_users
    WHERE regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = v_clean_cpf
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        IF v_existing_auth IS NOT NULL THEN
            RAISE EXCEPTION 'Este documento já possui acesso ao portal' USING ERRCODE = '42501';
        END IF;
        UPDATE public.client_portal_users
        SET auth_user_id = p_auth_id,
            email = v_auth_email,
            name = COALESCE(NULLIF(p_name, ''), name),
            phone = COALESCE(phone, v_phone),
            opportunity_id = COALESCE(opportunity_id, v_opp_id),
            user_id = COALESCE(user_id, v_owner_user_id),
            is_active = true,
            last_login = NOW()
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO public.client_portal_users (
            auth_user_id, cpf, name, email, phone, opportunity_id, user_id, is_active, last_login
        ) VALUES (
            p_auth_id, v_clean_cpf, p_name, v_auth_email, v_phone, v_opp_id, v_owner_user_id, true, NOW()
        );
    END IF;

    RETURN TRUE;
END;
$function$;

-- ═══ 4. GRANTS ══════════════════════════════════════════════════════════════

-- Funções de trigger/manutenção: ninguém chama via API
REVOKE EXECUTE ON FUNCTION public._provision_client_portal_user(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_auto_provision_client_portal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_to_client_portal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_opportunity_won() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sanitize_client_portal_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_client_portal_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dba_cleanup_duplicates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.provision_all_client_portal_users() FROM PUBLIC, anon, authenticated;

-- Só para usuários logados (checagens internas cuidam do resto)
REVOKE EXECUTE ON FUNCTION public.provision_client_portal_user(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_quark_points(uuid, text, text, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_client_tracking(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_financial_dre_summary(uuid, date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_client_tracking_phase(uuid, text, text, text) FROM PUBLIC, anon;
