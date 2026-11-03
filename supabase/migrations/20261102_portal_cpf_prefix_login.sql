-- ==============================================================================
-- QUARK OS — MIGRATION: 20261102_portal_cpf_prefix_login.sql
-- Autenticação no Portal com os 6 primeiros dígitos do CPF
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_client_auth_email(p_identifier text)
RETURNS text AS $$
DECLARE
    v_clean_doc text;
    v_email text;
    v_full_cpf text;
BEGIN
    IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
        RETURN NULL;
    END IF;

    -- Se for um email, retorna direto em minúsculas
    IF p_identifier LIKE '%@%' THEN
        RETURN lower(trim(p_identifier));
    END IF;

    -- Limpa pontuação do CPF/CNPJ
    v_clean_doc := regexp_replace(p_identifier, '\D', '', 'g');

    IF v_clean_doc = '' THEN
        RETURN NULL;
    END IF;

    -- Busca o email cadastrado em client_portal_users para esse CPF/CNPJ (exato ou pelos 6 primeiros dígitos)
    SELECT lower(trim(email)), regexp_replace(COALESCE(cpf, ''), '\D', '', 'g')
    INTO v_email, v_full_cpf
    FROM public.client_portal_users
    WHERE (
        regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = v_clean_doc
        OR (length(v_clean_doc) >= 6 AND regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') LIKE v_clean_doc || '%')
    )
    AND deleted_at IS NULL
    ORDER BY (auth_user_id IS NOT NULL) DESC, created_at DESC
    LIMIT 1;

    -- Se não encontrar email cadastrado ou estiver vazio, usa o email sintético padrão do CPF completo
    IF v_email IS NULL OR v_email = '' THEN
        IF v_full_cpf IS NOT NULL AND length(v_full_cpf) >= 6 THEN
            RETURN v_full_cpf || '@cliente.quarkenergia.com.br';
        ELSIF length(v_clean_doc) >= 6 THEN
            RETURN v_clean_doc || '@cliente.quarkenergia.com.br';
        END IF;
    END IF;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índice para busca rápida de prefixo de CPF
CREATE INDEX IF NOT EXISTS idx_client_portal_cpf_prefix 
ON public.client_portal_users(substring(regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') from 1 for 6)) 
WHERE deleted_at IS NULL;
