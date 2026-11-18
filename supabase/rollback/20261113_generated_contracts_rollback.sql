-- Rollback de 20261113_generated_contracts.sql (apaga o histórico de versões; arquivos do bucket precisam ser removidos pelo painel/API do Storage antes).
DROP TRIGGER IF EXISTS trg_documents_sync_generated_contract ON public.documents;
DROP FUNCTION IF EXISTS public.sync_generated_contract_signed();
DROP TABLE IF EXISTS public.generated_contracts;
DROP FUNCTION IF EXISTS public.generated_contracts_before_insert();
DROP FUNCTION IF EXISTS public.generated_contracts_before_update();
DROP POLICY IF EXISTS contratos_team_select ON storage.objects;
DROP POLICY IF EXISTS contratos_team_insert ON storage.objects;
DROP POLICY IF EXISTS contratos_admin_delete ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'contratos';  -- só depois de esvaziar o bucket
