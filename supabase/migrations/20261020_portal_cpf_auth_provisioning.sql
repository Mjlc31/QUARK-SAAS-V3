-- Migração: Provisionamento de Acesso ao Portal do Cliente via CPF e Senha Padrão
-- Criação de RPCs seguras para autenticação e provisionamento dinâmico

-- 1. Função RPC para buscar e-mail de autenticação a partir de CPF/CNPJ
CREATE OR REPLACE FUNCTION public.get_client_auth_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_clean text;
  v_email text;
BEGIN
  IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
    RETURN NULL;
  END IF;

  v_clean := regexp_replace(trim(p_identifier), '\D', '', 'g');

  IF length(v_clean) >= 6 THEN
    SELECT email INTO v_email
    FROM public.client_portal_users
    WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = v_clean
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_email IS NOT NULL THEN
      RETURN lower(trim(v_email));
    END IF;
  END IF;

  SELECT email INTO v_email
  FROM public.client_portal_users
  WHERE lower(trim(email)) = lower(trim(p_identifier))
  LIMIT 1;

  IF v_email IS NOT NULL THEN
    RETURN lower(trim(v_email));
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_auth_email(text) TO anon, authenticated;

-- 2. Função para provisionar ou sincronizar o acesso auth.users de um cliente
CREATE OR REPLACE FUNCTION public.provision_client_portal_user(
  p_client_id uuid,
  p_custom_password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
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

  UPDATE public.client_portal_users
  SET auth_user_id = v_user_id,
      email = v_email,
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
$$;

GRANT EXECUTE ON FUNCTION public.provision_client_portal_user(uuid, text) TO authenticated, service_role;

-- 3. Função em lote para provisionar todos os clientes com CPF
CREATE OR REPLACE FUNCTION public.provision_all_client_portal_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
  v_res jsonb;
BEGIN
  FOR v_rec IN 
    SELECT id 
    FROM public.client_portal_users 
    WHERE cpf IS NOT NULL AND length(regexp_replace(cpf, '\D', '', 'g')) >= 6
  LOOP
    v_res := public.provision_client_portal_user(v_rec.id);
    IF (v_res->>'success')::boolean THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_provisioned', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_all_client_portal_users() TO authenticated, service_role;
