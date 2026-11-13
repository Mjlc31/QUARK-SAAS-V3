-- Contratos gerados automaticamente a partir da proposta aprovada (backend/contratos).
-- Cada geração é uma versão nova e imutável: snapshot do JSON de entrada, campos renderizados e arquivos no Storage.
-- Só status e document_id (vínculo com a assinatura) mudam depois; arquivos são gravados uma única vez.

CREATE TABLE IF NOT EXISTS public.generated_contracts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id    text NOT NULL REFERENCES public.proposals(id) ON DELETE RESTRICT,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  version        integer NOT NULL,
  status         text NOT NULL DEFAULT 'rascunho'
                 CHECK (status IN ('rascunho', 'gerado', 'enviado_assinatura', 'assinado')),
  input_snapshot jsonb NOT NULL,
  fields         jsonb NOT NULL,
  warnings       text[] NOT NULL DEFAULT '{}',
  file_name      text NOT NULL,
  docx_path      text,
  pdf_path       text,
  document_id    uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_by     uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, version)
);

CREATE INDEX IF NOT EXISTS generated_contracts_document_id_idx ON public.generated_contracts (document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS generated_contracts_opportunity_id_idx ON public.generated_contracts (opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS generated_contracts_created_by_idx ON public.generated_contracts (created_by);

-- Versão sequencial por proposta (lock por proposta evita duas gerações simultâneas com o mesmo número).
CREATE OR REPLACE FUNCTION public.generated_contracts_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('generated_contracts:' || NEW.proposal_id));
  SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version FROM public.generated_contracts WHERE proposal_id = NEW.proposal_id;
  NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Imutabilidade: snapshot, versão, autoria e caminhos dos arquivos não mudam (caminho só pode ir de NULL a valor).
CREATE OR REPLACE FUNCTION public.generated_contracts_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.input_snapshot IS DISTINCT FROM OLD.input_snapshot
     OR NEW.fields IS DISTINCT FROM OLD.fields
     OR NEW.file_name IS DISTINCT FROM OLD.file_name
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.docx_path IS NOT NULL AND NEW.docx_path IS DISTINCT FROM OLD.docx_path)
     OR (OLD.pdf_path IS NOT NULL AND NEW.pdf_path IS DISTINCT FROM OLD.pdf_path) THEN
    RAISE EXCEPTION 'Versão de contrato é imutável: gere uma nova versão' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status <> 'rascunho' AND NEW.warnings IS DISTINCT FROM OLD.warnings THEN
    RAISE EXCEPTION 'Avisos de versão já gerada não mudam' USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generated_contracts_before_insert ON public.generated_contracts;
CREATE TRIGGER trg_generated_contracts_before_insert BEFORE INSERT ON public.generated_contracts
  FOR EACH ROW EXECUTE FUNCTION public.generated_contracts_before_insert();
DROP TRIGGER IF EXISTS trg_generated_contracts_before_update ON public.generated_contracts;
CREATE TRIGGER trg_generated_contracts_before_update BEFORE UPDATE ON public.generated_contracts
  FOR EACH ROW EXECUTE FUNCTION public.generated_contracts_before_update();

-- Quando todos assinam (sign_public_document marca documents.status = 'assinado'), a versão vira 'assinado'.
CREATE OR REPLACE FUNCTION public.sync_generated_contract_signed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.generated_contracts SET status = 'assinado' WHERE document_id = NEW.id AND status <> 'assinado';
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_generated_contract_signed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_documents_sync_generated_contract ON public.documents;
CREATE TRIGGER trg_documents_sync_generated_contract AFTER UPDATE OF status ON public.documents
  FOR EACH ROW WHEN (NEW.status = 'assinado' AND OLD.status IS DISTINCT FROM 'assinado')
  EXECUTE FUNCTION public.sync_generated_contract_signed();

-- RLS: mesmo padrão das demais tabelas (equipe via is_team_member, paridade admin via is_admin
-- = Super Admins Arthur + Anderson). Sem DELETE para a equipe: versões são trilha de auditoria.
ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_generated_contracts ON public.generated_contracts;
CREATE POLICY admin_all_generated_contracts ON public.generated_contracts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS generated_contracts_team_select ON public.generated_contracts;
CREATE POLICY generated_contracts_team_select ON public.generated_contracts
  FOR SELECT TO authenticated USING (public.is_team_member());
DROP POLICY IF EXISTS generated_contracts_team_insert ON public.generated_contracts;
CREATE POLICY generated_contracts_team_insert ON public.generated_contracts
  FOR INSERT TO authenticated WITH CHECK (public.is_team_member());
DROP POLICY IF EXISTS generated_contracts_team_update ON public.generated_contracts;
CREATE POLICY generated_contracts_team_update ON public.generated_contracts
  FOR UPDATE TO authenticated USING (public.is_team_member()) WITH CHECK (public.is_team_member());

REVOKE ALL ON public.generated_contracts FROM anon;
-- Os default privileges do Supabase dão ALL ao authenticated; TRUNCATE ignora RLS, então tira o que é destrutivo.
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.generated_contracts FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.generated_contracts TO authenticated;

-- Bucket privado: download só por URL assinada gerada pelo backend.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contratos', 'contratos', false, 10485760,
        ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS contratos_team_select ON storage.objects;
CREATE POLICY contratos_team_select ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'contratos' AND public.is_team_member());
DROP POLICY IF EXISTS contratos_team_insert ON storage.objects;
CREATE POLICY contratos_team_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contratos' AND public.is_team_member());
DROP POLICY IF EXISTS contratos_admin_delete ON storage.objects;
CREATE POLICY contratos_admin_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'contratos' AND public.is_admin());
