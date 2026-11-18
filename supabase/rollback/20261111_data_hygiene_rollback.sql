-- Rollback de 20261111_data_hygiene.sql
-- 1. Índices
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON public.proposals USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_opps_user ON public.opportunities USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_auth ON public.client_portal_users USING btree (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client ON public.support_tickets USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.support_tickets USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON public.ticket_messages USING btree (ticket_id);
CREATE INDEX IF NOT EXISTS idx_proj_tracking_project ON public.project_tracking USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_maint_srv_client ON public.maintenance_services USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_client_intel_lead ON public.client_intelligence USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_util_invoices_intel ON public.utility_invoices USING btree (intelligence_id);
CREATE INDEX IF NOT EXISTS financial_type_idx ON public.financial_transactions USING btree (type);
CREATE INDEX IF NOT EXISTS lead_pipelines_lead_id_idx ON public.lead_pipelines USING btree (lead_id);
CREATE INDEX IF NOT EXISTS lead_tags_lead_id_idx ON public.lead_tags USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_opportunity ON public.documents USING btree (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_document_signers_doc ON public.document_signers USING btree (document_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client ON public.support_tickets USING btree (client_id);

-- 2. Status de proposta
UPDATE public.proposals SET status = 'draft' WHERE id IN ('6a6e8ed5-ec15-41bf-b26b-283205227173','cea87792-c24b-48fb-a360-0a9051f0fe5f','6b91afda-8341-400c-9249-9b05ae0d87d0');
UPDATE public.proposals SET status = 'sent'  WHERE id = '40000000-0000-0000-0000-000000000040';

-- 3. Potência: antes era NULL nas 15 vendas Ganho; pró-labore do Coronel Cleydson era 5 kW / 0 módulos
UPDATE public.opportunities SET system_power = NULL WHERE status = 'Ganho' AND deleted_at IS NULL;
UPDATE public.prolabore_settlements SET system_size_kw = 5, module_count = 0 WHERE opportunity_id = '056fcb3d-3de1-4fc3-9f23-267129c8ffbc';
-- (client_portal_users.system_size_kw não muda de valor: é a própria fonte)
