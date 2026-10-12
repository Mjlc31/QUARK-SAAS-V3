-- =========================================================================
-- QUARK SAAS V3 - DATABASE MIGRATIONS & OTIMIZAÇÕES
-- Execute este script no SQL Editor do seu projeto Supabase
-- =========================================================================

-- 1. Criação do RPC para Cálculo do DRE (Performance Optimization)
-- Resolve o problema de travamento no front-end ao calcular DREs pesados
CREATE OR REPLACE FUNCTION get_financial_dre_summary(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dre JSONB;
BEGIN
    SELECT jsonb_build_object(
        'receita_bruta', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category IN ('instalacao_residencial', 'instalacao_comercial', 'manutencao', 'outros_receita')), 0),
        'deducoes', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category IN ('devolucao', 'cancelamento')), 0),
        'cpv_equipamentos', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'equipamentos'), 0),
        'cpv_mao_obra', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'mao_de_obra'), 0),
        'cpv_frete', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'frete'), 0),
        'cpv_outros', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'outros_cpv'), 0),
        'desp_salarios', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'salarios'), 0),
        'desp_marketing', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'marketing'), 0),
        'desp_aluguel', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'aluguel'), 0),
        'desp_combustivel', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'combustivel'), 0),
        'desp_software', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'software'), 0),
        'desp_escritorio', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'escritorio'), 0),
        'desp_financeira', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'taxa_financeira'), 0),
        'desp_outras', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'outras_despesas'), 0),
        'impostos', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'imposto'), 0),
        'total_receita', COALESCE(SUM(amount) FILTER (WHERE type = 'receita'), 0),
        'total_custo', COALESCE(SUM(amount) FILTER (WHERE type = 'custo'), 0),
        'total_despesa', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa'), 0),
        'count_receita', COUNT(*) FILTER (WHERE type = 'receita'),
        'count_custo', COUNT(*) FILTER (WHERE type = 'custo'),
        'count_despesa', COUNT(*) FILTER (WHERE type = 'despesa')
    ) INTO v_dre
    FROM public.financial_transactions
    WHERE user_id = p_user_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);
    
    RETURN v_dre;
END;
$$;

-- 2. Restrição Unique para Evitar Duplicação de Leads no Banco de Dados
-- Resolve o problema de "Merge Records" ao captar leads de landing pages
-- NOTA: O schema atual usa JSONB, então extraímos o telefone dinamicamente
CREATE UNIQUE INDEX IF NOT EXISTS unique_lead_phone_idx 
ON public.leads ((data->>'phone')) 
WHERE data->>'phone' IS NOT NULL AND data->>'phone' <> '';

-- 3. Gamificação e Arena Comercial (XP Events, Usage Daily e Leaderboard RPC)
CREATE TABLE IF NOT EXISTS public.xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, -- 'lead', 'followup', 'tarefa', 'proposta', 'envio', 'venda', 'aceite'
    points INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS xp_events_user_created_idx ON public.xp_events (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day DATE NOT NULL DEFAULT CURRENT_DATE,
    minutes INTEGER NOT NULL DEFAULT 0,
    last_ping TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, day)
);

CREATE OR REPLACE FUNCTION public.leaderboard(p_from timestamptz DEFAULT '-infinity')
RETURNS TABLE (
  user_id UUID, full_name TEXT, email TEXT, role TEXT,
  xp BIGINT, total_xp BIGINT, leads BIGINT, followups BIGINT, proposals BIGINT, sent BIGINT, sales BIGINT, minutes BIGINT, active_days BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH usage AS (
    SELECT u.user_id,
      SUM(LEAST(u.minutes, 240) / 10) FILTER (WHERE u.day >= (p_from AT TIME ZONE 'America/Sao_Paulo')::date) AS xp_p,
      SUM(LEAST(u.minutes, 240) / 10) AS xp_all,
      SUM(u.minutes) FILTER (WHERE u.day >= (p_from AT TIME ZONE 'America/Sao_Paulo')::date) AS minutes,
      COUNT(*) FILTER (WHERE u.day >= (p_from AT TIME ZONE 'America/Sao_Paulo')::date AND u.minutes >= 5) AS days
    FROM public.usage_daily u GROUP BY u.user_id
  ), ev AS (
    SELECT e.user_id,
      SUM(e.points) FILTER (WHERE e.created_at >= p_from) AS xp_p,
      SUM(e.points) AS xp_all,
      COUNT(*) FILTER (WHERE e.created_at >= p_from AND e.kind = 'lead') AS leads,
      COUNT(*) FILTER (WHERE e.created_at >= p_from AND e.kind IN ('followup', 'tarefa')) AS followups,
      COUNT(*) FILTER (WHERE e.created_at >= p_from AND e.kind = 'proposta') AS proposals,
      COUNT(*) FILTER (WHERE e.created_at >= p_from AND e.kind = 'envio') AS sent,
      COUNT(*) FILTER (WHERE e.created_at >= p_from AND e.kind IN ('venda', 'aceite')) AS sales
    FROM public.xp_events e GROUP BY e.user_id
  )
  SELECT p.id, p.name AS full_name, p.email, p.role,
    COALESCE(ev.xp_p, 0) + COALESCE(usage.xp_p, 0),
    COALESCE(ev.xp_all, 0) + COALESCE(usage.xp_all, 0),
    COALESCE(ev.leads, 0), COALESCE(ev.followups, 0), COALESCE(ev.proposals, 0), COALESCE(ev.sent, 0), COALESCE(ev.sales, 0),
    COALESCE(usage.minutes, 0), COALESCE(usage.days, 0)
  FROM public.users p
  LEFT JOIN ev ON ev.user_id = p.id
  LEFT JOIN usage ON usage.user_id = p.id
  ORDER BY 5 DESC, 6 DESC;
$$;



-- ─────────────────────────────────────────────────────────────
-- 4. Assinatura Eletrônica e Gestão de Documentos (Fase 2)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('procuracao', 'aluguel', 'recibo', 'nota_servico')),
  title TEXT NOT NULL,
  lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'assinado', 'cancelado')),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

CREATE TABLE IF NOT EXISTS public.document_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  position INT NOT NULL DEFAULT 0,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_name TEXT,
  signed_cpf TEXT,
  signature TEXT, -- base64 PNG
  ip TEXT,
  user_agent TEXT,
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(document_id, role)
);
CREATE INDEX IF NOT EXISTS idx_document_signers_token ON public.document_signers(token);
CREATE INDEX IF NOT EXISTS idx_document_signers_doc_id ON public.document_signers(document_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_auth_all" ON public.documents;
CREATE POLICY "documents_auth_all" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "document_signers_auth_all" ON public.document_signers;
CREATE POLICY "document_signers_auth_all" ON public.document_signers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Código de verificação do conteúdo assinado (Hash SHA-256)
CREATE OR REPLACE FUNCTION public.document_hash(p_doc public.documents)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(p_doc.kind || ':' || p_doc.data::text, 'UTF8')), 'hex');
$$;

-- RPC: Obter documento público para assinatura
CREATE OR REPLACE FUNCTION public.get_public_document(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.document_signers;
  d public.documents;
BEGIN
  SELECT * INTO s FROM public.document_signers WHERE token = p_token;
  IF s.id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO d FROM public.documents WHERE id = s.document_id;
  IF d.status = 'cancelado' THEN
    RETURN jsonb_build_object('cancelled', true);
  END IF;
  RETURN jsonb_build_object(
    'document', jsonb_build_object('id', d.id, 'kind', d.kind, 'title', d.title, 'data', d.data, 'status', d.status,
                                   'created_at', d.created_at, 'completed_at', d.completed_at, 'hash', public.document_hash(d)),
    'signer', jsonb_build_object('role', s.role, 'name', s.name, 'cpf', s.cpf, 'signed_at', s.signed_at, 'signed_name', s.signed_name),
    'signers', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                  'role', x.role, 'name', x.name, 'signed_at', x.signed_at, 'signed_name', x.signed_name,
                  'signed_cpf', x.signed_cpf, 'signature', x.signature, 'ip', x.ip, 'content_hash', x.content_hash
                ) ORDER BY x.position), '[]'::jsonb)
                FROM public.document_signers x WHERE x.document_id = d.id),
    'company', (SELECT jsonb_build_object('company_name', coalesce(company_name, 'Quark Energia'), 'logo_url', logo_url,
                  'whatsapp', whatsapp, 'phone', phone, 'email', email)
                FROM public.company_settings LIMIT 1)
  );
END;
$$;

-- RPC: Registrar visualização pública do documento
CREATE OR REPLACE FUNCTION public.view_public_document(p_token TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.document_signers SET viewed_at = now() WHERE token = p_token AND viewed_at IS NULL AND signed_at IS NULL;
$$;

-- RPC: Registrar assinatura eletrônica com validade jurídica
CREATE OR REPLACE FUNCTION public.sign_public_document(p_token TEXT, p_name TEXT, p_cpf TEXT, p_signature TEXT, p_ip TEXT, p_ua TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.document_signers;
  d public.documents;
  pending INT;
BEGIN
  IF coalesce(length(trim(p_name)), 0) < 3 OR p_signature NOT LIKE 'data:image/png;base64,%' OR length(p_signature) > 350000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dados');
  END IF;
  SELECT * INTO s FROM public.document_signers WHERE token = p_token FOR UPDATE;
  IF s.id IS NULL OR s.signed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assinado');
  END IF;
  SELECT * INTO d FROM public.documents WHERE id = s.document_id;
  IF d.status = 'cancelado' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cancelado');
  END IF;

  UPDATE public.document_signers
     SET signed_at = now(), signed_name = left(trim(p_name), 160), signed_cpf = left(regexp_replace(p_cpf, '\D', '', 'g'), 14),
         signature = p_signature, ip = left(p_ip, 64), user_agent = left(p_ua, 300), content_hash = public.document_hash(d),
         viewed_at = coalesce(viewed_at, now())
   WHERE id = s.id;

  SELECT count(*) INTO pending FROM public.document_signers WHERE document_id = d.id AND signed_at IS NULL;
  UPDATE public.documents
     SET status = CASE WHEN pending = 0 THEN 'assinado' else 'enviado' END,
         completed_at = CASE WHEN pending = 0 THEN now() else null END,
         updated_at = now()
   WHERE id = d.id;

  RETURN jsonb_build_object('ok', true, 'completed', pending = 0, 'title', d.title, 'document_id', d.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_document(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.view_public_document(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_public_document(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
