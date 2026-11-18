-- Migration: 20261105_harden_portal_rpcs.sql
-- Fecha RPCs SECURITY DEFINER que qualquer usuário logado (inclusive cliente do portal) podia chamar.
-- Triggers e funções SECURITY DEFINER que chamam essas RPCs internamente continuam funcionando
-- (rodam como owner; disparo de trigger não checa EXECUTE). Backend usa service_role.

-- 1. Função de limpeza com DELETE hardcoded: não deve existir na API.
DROP FUNCTION IF EXISTS public.dba_cleanup_duplicates();

-- 2. Provisionamento de Auth: só interno (triggers, get_client_auth_email) e service_role.
--    Também deixa de sobrescrever a senha de quem já tem conta (os triggers rodam a cada update
--    de oportunidade/cliente e voltavam a senha para os 6 primeiros dígitos do CPF).
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
  v_has_custom boolean := p_custom_password IS NOT NULL AND length(trim(p_custom_password)) >= 6;
  v_user_id uuid;
  v_existing_id uuid;
BEGIN
  SELECT * INTO v_client FROM public.client_portal_users WHERE id = p_client_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  v_clean_cpf := regexp_replace(COALESCE(v_client.cpf, ''), '\D', '', 'g');

  IF v_client.email IS NOT NULL AND v_client.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    v_email := lower(trim(v_client.email));
  ELSIF length(v_clean_cpf) >= 6 THEN
    v_email := v_clean_cpf || '@cliente.quarkenergia.com.br';
  ELSE
    v_email := substring(v_client.id::text from 1 for 8) || '@cliente.quarkenergia.com.br';
  END IF;

  IF v_has_custom THEN
    v_password := trim(p_custom_password);
  ELSIF length(v_clean_cpf) >= 6 THEN
    v_password := substring(v_clean_cpf from 1 for 6);
  ELSE
    v_password := 'quark2026';
  END IF;

  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE id = v_client.auth_user_id OR lower(email) = v_email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    v_user_id := v_existing_id;

    UPDATE auth.users
    SET encrypted_password = CASE
          WHEN v_has_custom OR COALESCE(encrypted_password, '') = '' THEN crypt(v_password, gen_salt('bf', 10))
          ELSE encrypted_password
        END,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', v_client.name, 'cpf', v_clean_cpf, 'role', 'client'),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        updated_at = now()
    WHERE id = v_user_id;

    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
      INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
      VALUES (gen_random_uuid(), v_user_id::text, v_user_id,
              jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
              'email', now(), now());
    END IF;
  ELSE
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      reauthentication_token, phone_change, phone_change_token, email_change_token_current,
      is_sso_user, is_anonymous
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf', 10)), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_client.name, 'cpf', v_clean_cpf, 'role', 'client'),
      now(), now(), '', '', '', '', '', '', '', '', false, false
    );

    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id::text, v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
            'email', now(), now());
  END IF;

  UPDATE public.client_portal_users
  SET auth_user_id = v_user_id,
      email = v_email,
      cpf = CASE WHEN length(v_clean_cpf) >= 6 THEN v_clean_cpf ELSE cpf END,
      is_active = COALESCE(is_active, true)
  WHERE id = p_client_id;

  RETURN jsonb_build_object('success', true, 'client_id', p_client_id, 'auth_user_id', v_user_id, 'email', v_email);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.provision_client_portal_user(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.provision_all_client_portal_users() FROM PUBLIC, anon, authenticated;

-- 3. Funções de trigger não devem ser chamáveis via /rpc.
REVOKE EXECUTE ON FUNCTION public.trg_auto_provision_client_portal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_auto_provision_client_portal_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_to_client_portal() FROM PUBLIC, anon, authenticated;

-- 4. Vínculo de conta no cadastro: só a própria conta, e nunca sobre um perfil já vinculado a outra.
CREATE OR REPLACE FUNCTION public.link_client_portal_user(p_auth_id uuid, p_cpf text, p_name text, p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_clean_cpf TEXT;
    v_existing_id UUID;
    v_existing_auth UUID;
    v_opp_id UUID;
    v_phone TEXT;
    v_owner_user_id UUID;
BEGIN
    IF auth.uid() IS NULL OR p_auth_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
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

    IF v_existing_auth IS NOT NULL AND v_existing_auth <> p_auth_id THEN
        RAISE EXCEPTION 'already registered' USING ERRCODE = '42501';
    END IF;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.client_portal_users
        SET auth_user_id = p_auth_id,
            email = p_email,
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
        )
        VALUES (p_auth_id, p_cpf, p_name, p_email, v_phone, v_opp_id, v_owner_user_id, true, NOW());
    END IF;

    RETURN TRUE;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.link_client_portal_user(uuid, text, text, text) FROM PUBLIC, anon;

-- 5. Verificação de CPF no cadastro: não devolve mais o nome do titular para quem não está logado.
CREATE OR REPLACE FUNCTION public.check_cpf_exists(p_cpf text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_clean_cpf TEXT := regexp_replace(p_cpf, '[^0-9]', '', 'g');
    v_auth_id UUID;
    v_found BOOLEAN;
BEGIN
    SELECT true, auth_user_id INTO v_found, v_auth_id
    FROM public.client_portal_users
    WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = v_clean_cpf
    LIMIT 1;

    IF v_found THEN
        RETURN json_build_object('exists', true, 'already_registered', v_auth_id IS NOT NULL);
    END IF;

    v_found := EXISTS (
        SELECT 1 FROM public.opportunities
        WHERE regexp_replace(COALESCE(cpf_cnpj, ''), '[^0-9]', '', 'g') = v_clean_cpf AND deleted_at IS NULL
    ) OR EXISTS (
        SELECT 1 FROM public.proposals
        WHERE regexp_replace(COALESCE(cpf_cnpj, ''), '[^0-9]', '', 'g') = v_clean_cpf AND deleted_at IS NULL
    );

    RETURN json_build_object('exists', v_found, 'already_registered', false);
END;
$function$;

-- 6. Fase da obra: só equipe (ou service_role) altera. Cliente só lê/inicializa a própria.
ALTER FUNCTION public.set_client_tracking_phase(uuid, text, text, text) RENAME TO _set_client_tracking_phase_unchecked;
REVOKE EXECUTE ON FUNCTION public._set_client_tracking_phase_unchecked(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.set_client_tracking_phase(p_client_id uuid, p_phase text, p_phase_label text, p_notes text DEFAULT NULL::text)
 RETURNS project_tracking
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF NOT (public.is_team_member() OR COALESCE(auth.role(), '') = 'service_role') THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    RETURN public._set_client_tracking_phase_unchecked(p_client_id, p_phase, p_phase_label, p_notes);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_client_tracking_phase(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_client_tracking_phase(uuid, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_or_create_client_tracking(p_client_id uuid)
 RETURNS SETOF project_tracking
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_phase text;
    v_phase_label text;
BEGIN
    IF NOT (
        public.is_team_member()
        OR COALESCE(auth.role(), '') = 'service_role'
        OR EXISTS (SELECT 1 FROM public.client_portal_users WHERE id = p_client_id AND auth_user_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.project_tracking WHERE client_id = p_client_id) THEN
        SELECT COALESCE(project_phase, 'compra_kit'), COALESCE(project_phase_label, 'Compra do Kit & Emissão de NF')
        INTO v_phase, v_phase_label
        FROM public.client_portal_users
        WHERE id = p_client_id;

        PERFORM public._set_client_tracking_phase_unchecked(p_client_id, v_phase, v_phase_label, 'Fase inicial do projeto.');
    END IF;

    RETURN QUERY
    SELECT * FROM public.project_tracking WHERE client_id = p_client_id ORDER BY started_at ASC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_client_tracking(uuid) FROM PUBLIC, anon;
