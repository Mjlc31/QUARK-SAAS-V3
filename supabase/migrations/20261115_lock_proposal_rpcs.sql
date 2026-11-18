-- Aplicada em produção em 2026-11-15 (auditoria QA).
-- get_proposals / get_proposal_by_id / save_proposal são SECURITY DEFINER sem checagem de auth e com EXECUTE para anon:
-- com a anon key (pública no bundle) qualquer pessoa lista as 25 propostas (42 campos, com telefone) e grava propostas/oportunidades.
-- duplicate_proposal e as RPCs de tracking aceitam qualquer usuário autenticado, inclusive cliente do portal.
-- O frontend só chama essas RPCs em telas da equipe, com sessão — a equipe continua funcionando.
-- Rollback: GRANT EXECUTE ON FUNCTION ... TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_proposals(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_proposal_by_id(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_proposal(jsonb) FROM PUBLIC, anon;
-- Função de trigger exposta como RPC sem necessidade.
REVOKE EXECUTE ON FUNCTION public.generated_contracts_before_insert() FROM PUBLIC, anon, authenticated;

-- Cliente do portal (authenticated, role 'client') ainda chamaria as três acima: leitura passa a exigir equipe.
CREATE OR REPLACE FUNCTION public.get_proposals(p_limit integer DEFAULT 100)
 RETURNS SETOF proposals
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  SELECT *
  FROM public.proposals
  WHERE deleted_at IS NULL
    AND public.is_team_member()
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT COALESCE(p_limit, 100);
$function$;

CREATE OR REPLACE FUNCTION public.get_proposal_by_id(p_id text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  SELECT to_jsonb(p)
  FROM public.proposals p
  WHERE (p.id = p_id OR p.number::text = p_id OR p.public_token = p_id)
    AND p.deleted_at IS NULL
    AND public.is_team_member()
  LIMIT 1;
$function$;

-- shortcut: save_proposal, duplicate_proposal, set_client_tracking_phase e get_or_create_client_tracking ainda aceitam
-- cliente autenticado do portal; fechar exige um guard is_team_member() no corpo de cada uma (o portal usa as de tracking
-- para o próprio cliente — precisa de checagem "equipe OU dono"). Fazer quando houver sessão de teste para validar.
