-- Migration: 20261119_revoke_anon_data_access.sql
-- A chave anon vai no bundle do frontend; com ela qualquer pessoa lia CPF, telefone, e-mail e endereço
-- de clientes/oportunidades, lia e alterava propostas e lia/escrevia agent_notes.
-- A equipe usa as policies *_authenticated_full / *_team_full; o backend usa a service role.
-- Páginas públicas seguem pelas RPCs por token (get_public_proposal, track_*, *_public_document, get_public_company).
-- Mantidas de propósito: leads_anon_insert_capture e activities_anon_insert* (só inserção, sem leitura).

drop policy if exists client_portal_users_anon_read_active on public.client_portal_users;
drop policy if exists opportunities_anon_select_active on public.opportunities;
drop policy if exists proposals_anon_select_active on public.proposals;
drop policy if exists proposals_anon_insert on public.proposals;
drop policy if exists proposals_anon_update on public.proposals;
drop policy if exists leads_anon_capture_and_read on public.leads;
drop policy if exists agent_notes_anon_all on public.agent_notes;

-- RPCs SECURITY DEFINER que listam/gravam qualquer proposta: só equipe logada (realinha com 20261117).
revoke execute on function public.save_proposal(jsonb) from anon, public;
revoke execute on function public.get_proposals(integer) from anon, public;
revoke execute on function public.get_proposal_by_id(text) from anon, public;
revoke execute on function public.duplicate_proposal(text, uuid) from anon, public;
grant execute on function public.save_proposal(jsonb) to authenticated, service_role;
grant execute on function public.get_proposals(integer) to authenticated, service_role;
grant execute on function public.get_proposal_by_id(text) to authenticated, service_role;
grant execute on function public.duplicate_proposal(text, uuid) to authenticated, service_role;
