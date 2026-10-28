-- ==============================================================================
-- MIGRATION: DATABASE ARCHITECTURE OPTIMIZATION & RELATIONAL INTEGRITY
-- Data: 2026-10-28
-- Projeto: QUARK SAAS V3 (sumydaewtszecrvdgoku)
-- Descrição:
--   1. Constraints e colunas de integridade (Social Studio, Receipts, Referrals)
--   2. Função imutável 'clean_phone_br' e índices funcionais para telefone
--   3. Índices de alta performance para CRM, Portal, Obras, Notas de IA e Manutenção
--   4. Triggers defensivos para auto-vinculação relacional (opportunity_id, user_id)
--   5. Sincronização automática de saldo de pontos no Portal do Cliente
--   6. Políticas RLS de paridade administrativa total para 'is_admin()'
-- ==============================================================================

-- 1. CONSTRAINTS E COLUNAS DE INTEGRIDADE
ALTER TABLE IF EXISTS public.social_accounts 
  ADD CONSTRAINT uq_social_accounts_username UNIQUE (username);

ALTER TABLE IF EXISTS public.social_posts 
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS account_username TEXT,
  ADD COLUMN IF NOT EXISTS post_key TEXT;

CREATE INDEX IF NOT EXISTS idx_social_posts_post_key ON public.social_posts(post_key);
CREATE INDEX IF NOT EXISTS idx_social_posts_account_username ON public.social_posts(account_username);

ALTER TABLE IF EXISTS public.receipts 
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_opportunity_id ON public.receipts(opportunity_id);

ALTER TABLE IF EXISTS public.client_referrals 
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_referrals_opportunity_id ON public.client_referrals(opportunity_id);

-- 2. NORMALIZAÇÃO DE TELEFONE BRASILEIRO E ÍNDICES FUNCIONAIS
CREATE OR REPLACE FUNCTION public.clean_phone_br(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN p IS NULL THEN NULL
    ELSE 
      CASE 
        WHEN regexp_replace(p, '[^0-9]', '', 'g') ~ '^55[0-9]{10,11}$' 
        THEN substring(regexp_replace(p, '[^0-9]', '', 'g') from 3)
        ELSE regexp_replace(p, '[^0-9]', '', 'g')
      END
  END;
$$;

CREATE INDEX IF NOT EXISTS idx_opportunities_clean_phone_br 
  ON public.opportunities (clean_phone_br(phone)) 
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_clean_phone_br 
  ON public.leads (clean_phone_br(phone)) 
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_portal_users_clean_phone_br 
  ON public.client_portal_users (clean_phone_br(phone)) 
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_clean_phone_br 
  ON public.proposals (clean_phone_br(phone)) 
  WHERE phone IS NOT NULL;

-- 3. ÍNDICES DE ALTA PERFORMANCE (B-TREE & PARTIAL INDEXES)
CREATE INDEX IF NOT EXISTS idx_project_tracking_active_current 
  ON public.project_tracking(lead_id) 
  WHERE is_current = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_active_created 
  ON public.leads (updated_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_active_user 
  ON public.tasks(user_id, deadline) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_client_status 
  ON public.support_tickets(client_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created 
  ON public.ticket_messages(ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_maintenance_services_client 
  ON public.maintenance_services(client_id, scheduled_date) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_notes_entity 
  ON public.agent_notes(entity_type, entity_id, created_at DESC);

-- 4. TRIGGERS DEFENSIVOS DE AUTO-VINCULAÇÃO RELACIONAL

-- Acompanhamento de Obras
CREATE OR REPLACE FUNCTION public.handle_project_tracking_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.opportunity_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT opportunity_id INTO NEW.opportunity_id 
    FROM public.client_portal_users 
    WHERE id = NEW.client_id;
  END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_project_tracking_defaults
BEFORE INSERT OR UPDATE ON public.project_tracking
FOR EACH ROW
EXECUTE FUNCTION public.handle_project_tracking_defaults();

-- Transações Financeiras (DRE)
CREATE OR REPLACE FUNCTION public.handle_financial_tx_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  IF NEW.date IS NULL THEN
    NEW.date := CURRENT_DATE;
  END IF;

  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := gen_random_uuid()::text;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_financial_tx_defaults
BEFORE INSERT OR UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_financial_tx_defaults();

-- Suporte & Tickets
CREATE OR REPLACE FUNCTION public.handle_support_ticket_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.opportunity_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT opportunity_id INTO NEW.opportunity_id 
    FROM public.client_portal_users 
    WHERE id = NEW.client_id;
  END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_support_ticket_defaults
BEFORE INSERT OR UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_support_ticket_defaults();

-- Manutenção Preventiva/Corretiva
CREATE OR REPLACE FUNCTION public.handle_maintenance_service_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.opportunity_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT opportunity_id INTO NEW.opportunity_id 
    FROM public.client_portal_users 
    WHERE id = NEW.client_id;
  END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_maintenance_service_defaults
BEFORE INSERT OR UPDATE ON public.maintenance_services
FOR EACH ROW
EXECUTE FUNCTION public.handle_maintenance_service_defaults();

-- Recibos & Comprovantes
CREATE OR REPLACE FUNCTION public.handle_receipt_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.opportunity_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    IF NEW.lead_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT id INTO NEW.opportunity_id 
      FROM public.opportunities 
      WHERE id = NEW.lead_id::uuid;
    END IF;
  END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_receipt_defaults
BEFORE INSERT OR UPDATE ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.handle_receipt_defaults();

-- Indicações de Clientes (Referral)
CREATE OR REPLACE FUNCTION public.handle_client_referral_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.opportunity_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    IF NEW.lead_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT id INTO NEW.opportunity_id 
      FROM public.opportunities 
      WHERE id = NEW.lead_id::uuid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_client_referral_defaults
BEFORE INSERT OR UPDATE ON public.client_referrals
FOR EACH ROW
EXECUTE FUNCTION public.handle_client_referral_defaults();

-- Sincronização do saldo de Quark Points no Portal
CREATE OR REPLACE FUNCTION public.sync_client_quark_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);
  IF v_client_id IS NOT NULL THEN
    UPDATE public.client_portal_users
    SET quark_points = (
      SELECT COALESCE(SUM(CASE WHEN type = 'debit' THEN -points ELSE points END), 0)
      FROM public.quark_points_transactions
      WHERE client_id = v_client_id
    ),
    updated_at = NOW()
    WHERE id = v_client_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_sync_quark_points
AFTER INSERT OR UPDATE OR DELETE ON public.quark_points_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_quark_points();

-- 5. POLÍTICAS RLS DE PARIDADE ADMINISTRATIVA TOTAL (is_admin())
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
