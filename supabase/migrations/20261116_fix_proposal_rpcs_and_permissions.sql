-- Migration: 20261116_fix_proposal_rpcs_and_permissions.sql
-- Objetivo: Blindar o salvamento e consulta de propostas via RPCs atômicas com permissão SECURITY DEFINER para anon, authenticated e service_role.

-- 1. Permissões de Execução
GRANT EXECUTE ON FUNCTION public.save_proposal(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_proposal_by_id(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_proposals(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.duplicate_proposal(text, uuid) TO anon, authenticated, service_role;

-- 2. get_proposal_by_id (sem lock restritivo para permitir leitura rápida por id ou number)
CREATE OR REPLACE FUNCTION public.get_proposal_by_id(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $$
DECLARE
  v_rec proposals%ROWTYPE;
BEGIN
  IF p_id IS NULL OR length(trim(p_id)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_rec 
  FROM proposals 
  WHERE deleted_at IS NULL 
    AND (id = p_id OR number::text = p_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_rec);
END;
$$;

-- 3. get_proposals (sem lock restritivo para listagem comercial instantânea)
CREATE OR REPLACE FUNCTION public.get_proposals(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(to_jsonb(p))
  INTO v_result
  FROM (
    SELECT *
    FROM proposals
    WHERE deleted_at IS NULL
    ORDER BY updated_at DESC, created_at DESC
    LIMIT COALESCE(p_limit, 50)
  ) p;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Garantir privilégios finais
GRANT EXECUTE ON FUNCTION public.save_proposal(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_proposal_by_id(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_proposals(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.duplicate_proposal(text, uuid) TO anon, authenticated, service_role;
