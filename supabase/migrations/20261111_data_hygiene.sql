-- Higiene do banco (auditoria 2026-11-11). Rollback: supabase/rollback/20261111_data_hygiene_rollback.sql

-- 1. Índices duplicados (fica um de cada par; nenhum sustenta constraint)
DROP INDEX IF EXISTS public.idx_client_intel_lead, public.idx_client_portal_auth, public.idx_document_signers_doc,
  public.idx_documents_opportunity, public.financial_type_idx, public.lead_pipelines_lead_id_idx,
  public.lead_tags_lead_id_idx, public.idx_maint_srv_client, public.idx_opps_user, public.idx_proj_tracking_project,
  public.idx_proposals_lead, public.idx_support_tickets_client, public.idx_tickets_client, public.idx_tickets_user,
  public.idx_ticket_msgs_ticket, public.idx_util_invoices_intel;

-- 2. Status de proposta em inglês -> padrão do app (ProposalStatus em src/lib/types.ts)
UPDATE public.proposals SET status = 'rascunho' WHERE status = 'draft';
UPDATE public.proposals SET status = 'enviada'  WHERE status = 'sent';

-- 3. Potência das vendas ganhas: copia do cadastro do portal / proposta. Sem fonte confiável fica NULL.
UPDATE public.opportunities o
SET system_power = src.kwp
FROM (
  SELECT o2.id, COALESCE(NULLIF(c.system_size_kw, 0),
           (SELECT max(p.power_kwp) FROM public.proposals p
             WHERE (p.opportunity_id::text = o2.id::text OR p.lead_id::text = o2.id::text) AND p.deleted_at IS NULL)) AS kwp
  FROM public.opportunities o2
  LEFT JOIN public.client_portal_users c ON c.opportunity_id = o2.id AND c.deleted_at IS NULL
  WHERE o2.status = 'Ganho' AND o2.deleted_at IS NULL AND COALESCE(o2.system_power, 0) = 0
) src
WHERE o.id = src.id AND src.kwp > 0;

-- pró-labore que estava com placeholder (0 módulos): mesma fórmula do trigger handle_opportunity_won
UPDATE public.prolabore_settlements
SET module_count = ROUND((system_size_kw * 1000) / 550)
WHERE deleted_at IS NULL AND module_count = 0 AND system_size_kw > 0
  AND opportunity_id = '056fcb3d-3de1-4fc3-9f23-267129c8ffbc';
