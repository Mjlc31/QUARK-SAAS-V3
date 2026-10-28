-- ==============================================================================
-- MIGRATION: DATABASE ARCHITECTURE OPTIMIZATION & ADMIN RLS PARITY
-- Data: 2026-10-28
-- Projeto: QUARK SAAS V3 (sumydaewtszecrvdgoku)
-- Descrição:
--   1. Constraints e integridade relacional para Social Studio
--   2. Índices de alta performance para CRM, Portal, Acompanhamento de Obras e Manutenção
--   3. Políticas RLS de paridade administrativa total para 'is_admin()'
-- ==============================================================================

-- 1. CONSTRAINTS E COLUNAS DE SOCIAL STUDIO
ALTER TABLE IF EXISTS public.social_accounts 
  ADD CONSTRAINT uq_social_accounts_username UNIQUE (username);

ALTER TABLE IF EXISTS public.social_posts 
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS account_username TEXT,
  ADD COLUMN IF NOT EXISTS post_key TEXT;

CREATE INDEX IF NOT EXISTS idx_social_posts_post_key ON public.social_posts(post_key);
CREATE INDEX IF NOT EXISTS idx_social_posts_account_username ON public.social_posts(account_username);

-- 2. ÍNDICES DE ALTA PERFORMANCE (B-TREE & PARTIAL INDEXES)

-- Busca de clientes e portais por telefone limpo
CREATE INDEX IF NOT EXISTS idx_client_portal_users_phone_clean 
  ON public.client_portal_users (regexp_replace(phone, '\D', '', 'g'));

CREATE INDEX IF NOT EXISTS idx_proposals_phone_clean 
  ON public.proposals (regexp_replace(client_phone, '\D', '', 'g'));

CREATE INDEX IF NOT EXISTS idx_leads_phone_clean 
  ON public.leads (regexp_replace(phone, '\D', '', 'g'));

-- Acompanhamento de obras (filtragem do estágio ativo)
CREATE INDEX IF NOT EXISTS idx_project_tracking_active_current 
  ON public.project_tracking(lead_id) 
  WHERE is_current = true AND deleted_at IS NULL;

-- CRM Leads (ordenação e paginação ativa)
CREATE INDEX IF NOT EXISTS idx_leads_active_created 
  ON public.leads (updated_at DESC) 
  WHERE deleted_at IS NULL;

-- Tarefas ativas por responsável
CREATE INDEX IF NOT EXISTS idx_tasks_active_user 
  ON public.tasks(user_id, deadline) 
  WHERE deleted_at IS NULL;

-- Suporte e Tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_status 
  ON public.support_tickets(client_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created 
  ON public.ticket_messages(ticket_id, created_at ASC);

-- Manutenção Preventiva e Corretiva
CREATE INDEX IF NOT EXISTS idx_maintenance_services_client 
  ON public.maintenance_services(client_id, scheduled_date) 
  WHERE deleted_at IS NULL;

-- 3. POLÍTICAS RLS DE PARIDADE ADMINISTRATIVA TOTAL (is_admin())
-- Garante que todos os administradores cadastrados (arthurmoraesp12@gmail.com, ctt.andersonalves@gmail.com, etc.)
-- possuam acesso irrestrito às tabelas operacionais da Quark.

DO $$
BEGIN
  -- ticket_messages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ticket_messages' AND policyname = 'admin_all_ticket_messages') THEN
    CREATE POLICY admin_all_ticket_messages ON public.ticket_messages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- maintenance_services
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'maintenance_services' AND policyname = 'admin_all_maintenance_services') THEN
    CREATE POLICY admin_all_maintenance_services ON public.maintenance_services FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- maintenance_alerts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'maintenance_alerts' AND policyname = 'admin_all_maintenance_alerts') THEN
    CREATE POLICY admin_all_maintenance_alerts ON public.maintenance_alerts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- receipts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'receipts' AND policyname = 'admin_all_receipts') THEN
    CREATE POLICY admin_all_receipts ON public.receipts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- client_referrals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_referrals' AND policyname = 'admin_all_client_referrals') THEN
    CREATE POLICY admin_all_client_referrals ON public.client_referrals FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- quark_points_transactions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quark_points_transactions' AND policyname = 'admin_all_points_tx') THEN
    CREATE POLICY admin_all_points_tx ON public.quark_points_transactions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- quark_points_redemptions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quark_points_redemptions' AND policyname = 'admin_all_points_redemptions') THEN
    CREATE POLICY admin_all_points_redemptions ON public.quark_points_redemptions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- document_signers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_signers' AND policyname = 'admin_all_doc_signers') THEN
    CREATE POLICY admin_all_doc_signers ON public.document_signers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- utility_invoices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_invoices' AND policyname = 'admin_all_utility_invoices') THEN
    CREATE POLICY admin_all_utility_invoices ON public.utility_invoices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- whatsapp_messages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_messages' AND policyname = 'admin_all_whatsapp_messages') THEN
    CREATE POLICY admin_all_whatsapp_messages ON public.whatsapp_messages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- ecommerce_products
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ecommerce_products' AND policyname = 'admin_all_ecommerce_products') THEN
    CREATE POLICY admin_all_ecommerce_products ON public.ecommerce_products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- pipelines
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'admin_all_pipelines') THEN
    CREATE POLICY admin_all_pipelines ON public.pipelines FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- tags
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'admin_all_tags') THEN
    CREATE POLICY admin_all_tags ON public.tags FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- lead_pipelines
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_pipelines' AND policyname = 'admin_all_lead_pipelines') THEN
    CREATE POLICY admin_all_lead_pipelines ON public.lead_pipelines FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- lead_tags
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_tags' AND policyname = 'admin_all_lead_tags') THEN
    CREATE POLICY admin_all_lead_tags ON public.lead_tags FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- products
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'admin_all_products') THEN
    CREATE POLICY admin_all_products ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'admin_all_settings') THEN
    CREATE POLICY admin_all_settings ON public.settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- proposal_views
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposal_views' AND policyname = 'admin_all_proposal_views') THEN
    CREATE POLICY admin_all_proposal_views ON public.proposal_views FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- xp_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'xp_events' AND policyname = 'admin_all_xp_events') THEN
    CREATE POLICY admin_all_xp_events ON public.xp_events FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  -- notifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'admin_all_notifications') THEN
    CREATE POLICY admin_all_notifications ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
