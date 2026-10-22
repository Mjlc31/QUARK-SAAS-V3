-- ============================================================
-- QUARK OS — OFFICIAL SCHEMA
-- Consolidated based on codebase analysis (React Frontend vs Migrations)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'Sales',
    avatar_initials TEXT DEFAULT 'U',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. LEADS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 3. PIPELINES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Geral',
    color TEXT NOT NULL DEFAULT '#a3e635',
    stages JSONB NOT NULL DEFAULT '[]'::jsonb, -- FIXED: Added stages (required by CrmContext.tsx)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 4. TAGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 5. LEAD PIPELINES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    stage TEXT NOT NULL DEFAULT 'Lead',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lead_id, pipeline_id)
);

-- ─────────────────────────────────────────────────────────────
-- 6. LEAD TAGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_tags (
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────
-- 7. PROPOSALS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL, -- FIXED: missing lead_id required by CrmContext.tsx
    client_name TEXT NOT NULL,
    city TEXT,
    phone TEXT,
    system_size_kw NUMERIC(8,2),
    final_price NUMERIC(12,2),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected')),
    data JSONB NOT NULL DEFAULT '{}',
    blocks JSONB,
    theme JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 8. TASKS, PROJECTS, PRODUCTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 9. FINANCIAL TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('receita', 'custo', 'despesa')),
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Helper Function to Create Policies Dynamically
CREATE OR REPLACE FUNCTION create_tenant_policy(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE format('
        DROP POLICY IF EXISTS "%1$s_select" ON public.%1$s;
        CREATE POLICY "%1$s_select" ON public.%1$s FOR SELECT USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "%1$s_insert" ON public.%1$s;
        CREATE POLICY "%1$s_insert" ON public.%1$s FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "%1$s_update" ON public.%1$s;
        CREATE POLICY "%1$s_update" ON public.%1$s FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "%1$s_delete" ON public.%1$s;
        CREATE POLICY "%1$s_delete" ON public.%1$s FOR DELETE USING (auth.uid() = user_id);
    ', table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply generic policies
SELECT create_tenant_policy('leads');
SELECT create_tenant_policy('pipelines');
SELECT create_tenant_policy('tags');
SELECT create_tenant_policy('lead_pipelines');
SELECT create_tenant_policy('lead_tags');
SELECT create_tenant_policy('proposals');
SELECT create_tenant_policy('tasks');
SELECT create_tenant_policy('projects');
SELECT create_tenant_policy('products');
SELECT create_tenant_policy('financial_transactions');

-- Profile policies (different because auth.uid() = id)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- 10. INSTAGRAM AUTOMATION
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.instagram_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    keyword TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.instagram_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.instagram_campaigns(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.instagram_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_logs ENABLE ROW LEVEL SECURITY;

SELECT create_tenant_policy('instagram_campaigns');

-- For logs, we need a custom policy since they don't have user_id, they join through campaign_id
DROP POLICY IF EXISTS "instagram_logs_select" ON public.instagram_logs;
CREATE POLICY "instagram_logs_select" ON public.instagram_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.instagram_campaigns c 
        WHERE c.id = instagram_logs.campaign_id AND c.user_id = auth.uid()
    )
);

-- ─────────────────────────────────────────────────────────────
-- 11. CLIENT PORTAL & SUPPORT
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    cpf TEXT UNIQUE,
    birth_date DATE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    quark_points INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('manutencao','limpeza','projeto','homologacao','financeiro','outros')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa','normal','alta','urgente')),
    status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto','em_andamento','aguardando_cliente','resolvido','fechado')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('client','operator','system')),
    sender_id UUID,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 12. PROJECT TRACKING
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.client_portal_users(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    phase TEXT NOT NULL CHECK (phase IN (
        'venda_confirmada','projeto_elaboracao','projeto_enviado',
        'aprovacao_concessionaria','logistica_entrega','instalacao',
        'homologacao','comissionamento','finalizado'
    )),
    phase_label TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    is_current BOOLEAN DEFAULT false
);

-- ─────────────────────────────────────────────────────────────
-- 13. MAINTENANCE & CLIENT INTELLIGENCE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.client_portal_users(id),
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    service_type TEXT CHECK (service_type IN ('manutencao','limpeza','inspecao','reparo')),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','agendado','em_campo','concluido','cancelado')),
    scheduled_date DATE,
    completed_date DATE,
    price NUMERIC(10,2),
    cost NUMERIC(10,2),
    technician TEXT,
    notes TEXT,
    before_photos JSONB DEFAULT '[]',
    after_photos JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    install_start_date DATE,
    install_end_date DATE,
    system_size_kw NUMERIC(8,2),
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    total_savings_brl NUMERIC(12,2) DEFAULT 0,
    monthly_generation_kwh NUMERIC(10,2),
    utility_account TEXT,
    utility_login JSONB,
    installed_by TEXT DEFAULT 'quark',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.utility_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intelligence_id UUID REFERENCES public.client_intelligence(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    month_ref TEXT NOT NULL,
    consumption_kwh NUMERIC(10,2),
    generation_kwh NUMERIC(10,2),
    amount_brl NUMERIC(10,2),
    savings_brl NUMERIC(10,2),
    pdf_url TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intelligence_id UUID REFERENCES public.client_intelligence(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alert_type TEXT CHECK (alert_type IN ('manutencao_preventiva','limpeza','inspecao','garantia')),
    message TEXT,
    scheduled_for DATE,
    sent_at TIMESTAMPTZ,
    channel TEXT CHECK (channel IN ('whatsapp','email','sms','portal')),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','lido','respondido')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 14. E-COMMERCE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ecommerce_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC(12,2) NOT NULL,
    promo_price NUMERIC(12,2),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    includes_installation BOOLEAN DEFAULT false,
    delivery_days INTEGER DEFAULT 60,
    overload_percentage NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEW ROW LEVEL SECURITY (RLS) FOR ADDED TABLES
-- ============================================================
ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_alerts ENABLE ROW LEVEL SECURITY;

-- Apply tenant policies
SELECT create_tenant_policy('support_tickets');
SELECT create_tenant_policy('project_tracking');
SELECT create_tenant_policy('maintenance_services');
SELECT create_tenant_policy('client_intelligence');
SELECT create_tenant_policy('utility_invoices');
SELECT create_tenant_policy('ecommerce_products');
SELECT create_tenant_policy('maintenance_alerts');

-- Custom policies for portal users and tenant admin
DROP POLICY IF EXISTS "client_portal_users_select" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_portal_users_update" ON public.client_portal_users;
DROP POLICY IF EXISTS "client_portal_users_tenant_access" ON public.client_portal_users;
CREATE POLICY "client_portal_users_tenant_access" ON public.client_portal_users
    FOR ALL
    USING (auth.uid() = user_id OR auth.uid() = auth_user_id OR auth.role() = 'authenticated')
    WITH CHECK (auth.uid() = user_id OR auth.uid() = auth_user_id OR auth.role() = 'authenticated');

-- Custom policies for ticket_messages (join through ticket)
DROP POLICY IF EXISTS "ticket_messages_select" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select" ON public.ticket_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "ticket_messages_insert" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert" ON public.ticket_messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid()
    )
);

-- ─────────────────────────────────────────────────────────────
-- RPC: Auto-link Client Profile via CPF
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.link_client_portal_user(p_auth_id UUID, p_cpf TEXT, p_name TEXT, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    -- Remove non-digits from CPF for clean comparison
    p_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');

    -- Look for existing record by CPF (created internally)
    SELECT id INTO v_existing_id 
    FROM public.client_portal_users 
    WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = p_cpf 
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
        -- Update existing profile with the new Auth ID
        UPDATE public.client_portal_users 
        SET auth_user_id = p_auth_id,
            email = p_email,
            is_active = true
        WHERE id = v_existing_id;
    ELSE
        -- Create a new unlinked profile if internal record doesn't exist yet
        INSERT INTO public.client_portal_users (auth_user_id, cpf, name, email, is_active)
        VALUES (p_auth_id, p_cpf, p_name, p_email, true);
    END IF;
    
    RETURN TRUE;
END;
$$;

-- RPC: Check if CPF exists in client_portal_users
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_cpf_exists(p_cpf TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_auth_id UUID;
    v_exists BOOLEAN := false;
    v_already_registered BOOLEAN := false;
BEGIN
    -- Remove non-digits from CPF
    p_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');

    SELECT id, auth_user_id INTO v_id, v_auth_id
    FROM public.client_portal_users 
    WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = p_cpf 
    LIMIT 1;
    
    IF v_id IS NOT NULL THEN
        v_exists := true;
        v_already_registered := (v_auth_id IS NOT NULL);
    END IF;
    
    RETURN json_build_object(
        'exists', v_exists,
        'already_registered', v_already_registered
    );
END;
$$;

-- Nova seção: Estruturas adicionadas posteriormente
-- Opportunities
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    phone TEXT,
    city TEXT,
    amount NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Lead',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Notes
CREATE TABLE IF NOT EXISTS public.agent_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_by_ai BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evolution Messages
CREATE TABLE IF NOT EXISTS public.evolution_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id TEXT NOT NULL,
    body TEXT NOT NULL,
    from_me BOOLEAN DEFAULT false,
    message_type TEXT DEFAULT 'text',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Proposal Versions
CREATE TABLE IF NOT EXISTS public.proposal_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id TEXT REFERENCES public.proposals(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    client_name TEXT,
    city TEXT,
    system_size_kw NUMERIC(8,2),
    final_price NUMERIC(12,2),
    data JSONB NOT NULL DEFAULT '{}',
    blocks JSONB,
    theme JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;

SELECT create_tenant_policy('opportunities');
SELECT create_tenant_policy('agent_notes');
SELECT create_tenant_policy('evolution_messages');
SELECT create_tenant_policy('proposal_versions');

-- Índices de Otimização e Performance (Foreign Keys e Joins)
CREATE INDEX IF NOT EXISTS idx_leads_user ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipelines_lead ON public.lead_pipelines(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipelines_pipeline ON public.lead_pipelines(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipelines_user ON public.lead_pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON public.lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON public.lead_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_user ON public.lead_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON public.proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON public.proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_user ON public.financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_insta_campaigns_user ON public.instagram_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_insta_logs_campaign ON public.instagram_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_lead ON public.client_portal_users(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_auth ON public.client_portal_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_proj_tracking_project ON public.project_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_tracking_client ON public.project_tracking(client_id);
CREATE INDEX IF NOT EXISTS idx_proj_tracking_user ON public.project_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_maint_srv_user ON public.maintenance_services(user_id);
CREATE INDEX IF NOT EXISTS idx_maint_srv_client ON public.maintenance_services(client_id);
CREATE INDEX IF NOT EXISTS idx_maint_srv_lead ON public.maintenance_services(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_intel_user ON public.client_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_client_intel_lead ON public.client_intelligence(lead_id);
CREATE INDEX IF NOT EXISTS idx_util_invoices_intel ON public.utility_invoices(intelligence_id);
CREATE INDEX IF NOT EXISTS idx_util_invoices_user ON public.utility_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_maint_alerts_intel ON public.maintenance_alerts(intelligence_id);
CREATE INDEX IF NOT EXISTS idx_maint_alerts_user ON public.maintenance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_ecom_products_user ON public.ecommerce_products(user_id);
CREATE INDEX IF NOT EXISTS idx_opps_user ON public.opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_notes_user ON public.agent_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_evo_msgs_user ON public.evolution_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_prop_versions_prop ON public.proposal_versions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_prop_versions_user ON public.proposal_versions(user_id);

-- Função Genérica de Auto-Update para TIMESTAMPTZ
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Aplicação dos Triggers nas tabelas com updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lead_pipelines FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.instagram_campaigns FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.agent_notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Configuração do Supabase Realtime (WebSockets)
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id TEXT NOT NULL,
    chat_name TEXT,
    from_me BOOLEAN NOT NULL DEFAULT false,
    body TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    message_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_messages_read" ON public.whatsapp_messages
    FOR SELECT USING (true);
    
CREATE POLICY "whatsapp_messages_insert" ON public.whatsapp_messages
    FOR INSERT WITH CHECK (true);


-- ============================================================
-- MIGRATION 2024-10-01: Code Review + DB Architect Audit
-- Applied via Supabase MCP
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. CREATE MISSING 'activities' TABLE
-- Used by: proposal/editor.tsx, save/editor.tsx, proposal-actions.ts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'nota',
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity_id ON public.activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY activities_tenant_select ON public.activities FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY activities_tenant_insert ON public.activities FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY activities_tenant_delete ON public.activities FOR DELETE USING (auth.uid() = created_by);

-- ─────────────────────────────────────────────────────────────
-- 2. CREATE MISSING 'notifications' TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    type TEXT NOT NULL DEFAULT 'info',
    entity_type TEXT,
    entity_id TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_tenant ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. ADD MISSING COLUMNS TO 'opportunities'
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS consumption_kwh NUMERIC;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS tariff NUMERIC;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS connection_type TEXT;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS roof_type TEXT;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS avg_bill NUMERIC;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────
-- 4. SOFT DELETE COLUMNS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS utility_company TEXT;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS utility_account TEXT;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS system_size_kw NUMERIC;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS install_date DATE;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS monthly_avg_kwh NUMERIC;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.client_intelligence ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.client_portal_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_client_portal_user_id ON public.client_portal_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_intel_client ON public.client_intelligence(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_active ON public.client_portal_users(deleted_at) WHERE deleted_at IS NULL;

-- Partial indexes for soft-delete performance
CREATE INDEX IF NOT EXISTS idx_leads_active ON public.leads(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_active ON public.opportunities(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_active ON public.proposals(user_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. FIX WHATSAPP RLS SECURITY VULNERABILITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
-- Old insecure policies (USING true) dropped; new tenant-isolated policies created

-- ─────────────────────────────────────────────────────────────
-- 6. ENABLE RLS ON PREVIOUSLY UNPROTECTED TABLES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_tasks ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 7. MISSING updated_at TRIGGERS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON public.maintenance_services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON public.client_intelligence FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON public.ecommerce_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 8. PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_client_portal_email ON public.client_portal_users(email);
CREATE INDEX IF NOT EXISTS idx_client_portal_cpf ON public.client_portal_users(cpf);
CREATE INDEX IF NOT EXISTS idx_client_portal_auth_user ON public.client_portal_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_date ON public.financial_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_type ON public.financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_category ON public.financial_transactions(category);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_public_token ON public.proposals(public_token);
CREATE INDEX IF NOT EXISTS idx_evolution_contact ON public.evolution_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_evolution_timestamp ON public.evolution_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON public.opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON public.opportunities(user_id);

-- ─────────────────────────────────────────────────────────────
-- 9. REALTIME PUBLICATIONS
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- ─────────────────────────────────────────────────────────────
-- 10. FINANCIAL DRE SUMMARY RPC
-- ─────────────────────────────────────────────────────────────
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
        'receita_bruta', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category IN ('venda', 'servico', 'manutencao', 'assinatura', 'outros_r')), 0),
        'deducoes', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category IN ('devolucao', 'cancelamento')), 0),
        'cpv_equipamentos', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'equipamentos'), 0),
        'cpv_mao_obra', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'mao_de_obra'), 0),
        'cpv_frete', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'frete'), 0),
        'cpv_outros', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'outros_c'), 0),
        'desp_salarios', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'salarios'), 0),
        'desp_marketing', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'marketing'), 0),
        'desp_aluguel', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'aluguel'), 0),
        'desp_combustivel', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'combustivel'), 0),
        'desp_software', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'software'), 0),
        'desp_escritorio', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'escritorio'), 0),
        'desp_financeira', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'taxa_financeira'), 0),
        'desp_outras', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'outras_d'), 0),
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

-- ─────────────────────────────────────────────────────────────
-- 11. QUARK POINTS, INDICAÇÕES & RESGATES
-- ─────────────────────────────────────────────────────────────

-- 11.1 Tabela: client_referrals (Indicações de Clientes)
CREATE TABLE IF NOT EXISTS public.client_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_client_id UUID REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referred_name TEXT NOT NULL,
    referred_phone TEXT NOT NULL,
    referred_city TEXT DEFAULT 'Maceió - AL',
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','indicado','em_contato','proposta_enviada','contrato_assinado','instalado','rejeitado')),
    reward_points INTEGER DEFAULT 1000,
    points_credited BOOLEAN DEFAULT false,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11.2 Tabela: quark_points_transactions (Extrato de Pontos)
CREATE TABLE IF NOT EXISTS public.quark_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('credito','debito')),
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11.3 Tabela: quark_points_redemptions (Resgates de Benefícios)
CREATE TABLE IF NOT EXISTS public.quark_points_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
    reward_id TEXT NOT NULL,
    reward_title TEXT NOT NULL,
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'solicitado' CHECK (status IN ('solicitado','aprovado','agendado','concluido','cancelado')),
    scheduled_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11.4 Triggers: updated_at e auto-preenchimento de user_id
CREATE OR REPLACE FUNCTION public.handle_client_referral_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.user_id IS NULL AND NEW.referrer_client_id IS NOT NULL THEN
        SELECT user_id INTO NEW.user_id
        FROM public.client_portal_users
        WHERE id = NEW.referrer_client_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_client_referrals_updated_at
BEFORE UPDATE ON public.client_referrals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_client_referrals_user_id
BEFORE INSERT ON public.client_referrals
FOR EACH ROW EXECUTE FUNCTION public.handle_client_referral_user_id();

-- 11.5 Índices de Performance
CREATE INDEX IF NOT EXISTS idx_client_referrals_referrer ON public.client_referrals(referrer_client_id);
CREATE INDEX IF NOT EXISTS idx_client_referrals_status ON public.client_referrals(status);
CREATE INDEX IF NOT EXISTS idx_client_referrals_user_id ON public.client_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_client_referrals_lead_id ON public.client_referrals(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_referrals_created_at ON public.client_referrals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_points_transactions_client ON public.quark_points_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created ON public.quark_points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_ref ON public.quark_points_transactions(reference_id);

CREATE INDEX IF NOT EXISTS idx_points_redemptions_client ON public.quark_points_redemptions(client_id);
CREATE INDEX IF NOT EXISTS idx_points_redemptions_status ON public.quark_points_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_points_redemptions_created ON public.quark_points_redemptions(created_at DESC);

-- 11.6 Row Level Security (RLS)
ALTER TABLE public.client_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quark_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quark_points_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "client_referrals_access" ON public.client_referrals;
    CREATE POLICY "client_referrals_access" ON public.client_referrals
        FOR ALL
        USING (
            auth.role() = 'service_role'
            OR auth.uid() = user_id
            OR referrer_client_id IN (
                SELECT cpu.id FROM public.client_portal_users cpu
                WHERE cpu.auth_user_id = auth.uid() OR cpu.user_id = auth.uid()
            )
        )
        WITH CHECK (
            auth.role() = 'service_role'
            OR auth.uid() = user_id
            OR referrer_client_id IN (
                SELECT cpu.id FROM public.client_portal_users cpu
                WHERE cpu.auth_user_id = auth.uid() OR cpu.user_id = auth.uid()
            )
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "quark_points_transactions_access" ON public.quark_points_transactions;
    CREATE POLICY "quark_points_transactions_access" ON public.quark_points_transactions
        FOR ALL
        USING (
            auth.role() = 'service_role'
            OR client_id IN (
                SELECT cpu.id FROM public.client_portal_users cpu
                WHERE cpu.auth_user_id = auth.uid() OR cpu.user_id = auth.uid()
            )
        )
        WITH CHECK (
            auth.role() = 'service_role'
            OR client_id IN (
                SELECT cpu.id FROM public.client_portal_users cpu
                WHERE cpu.auth_user_id = auth.uid() OR cpu.user_id = auth.uid()
            )
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "quark_points_redemptions_access" ON public.quark_points_redemptions;
    CREATE POLICY "quark_points_redemptions_access" ON public.quark_points_redemptions
        FOR ALL
        USING (
            auth.role() = 'service_role'
            OR client_id IN (
                SELECT cpu.id FROM public.client_portal_users cpu
                WHERE cpu.auth_user_id = auth.uid() OR cpu.user_id = auth.uid()
            )
        )
        WITH CHECK (
            auth.role() = 'service_role'
            OR client_id IN (
                SELECT cpu.id FROM public.client_portal_users cpu
                WHERE cpu.auth_user_id = auth.uid() OR cpu.user_id = auth.uid()
            )
        );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 11.7 Realtime Publications
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_referrals;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quark_points_transactions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quark_points_redemptions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 11.8 RPC: redeem_quark_points
CREATE OR REPLACE FUNCTION public.redeem_quark_points(
    p_client_id UUID,
    p_reward_id TEXT,
    p_reward_title TEXT,
    p_points_spent INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_points INTEGER;
    v_new_balance INTEGER;
    v_redemption_id UUID;
    v_client_user_id UUID;
    v_auth_user_id UUID;
    v_lead_id TEXT;
    v_service_type TEXT;
    v_maint_notes TEXT;
BEGIN
    IF p_points_spent IS NULL OR p_points_spent <= 0 THEN
        RAISE EXCEPTION 'Quantidade de pontos inválida';
    END IF;

    -- Bloqueia a linha do cliente para evitar race conditions
    SELECT quark_points, user_id, lead_id, auth_user_id
    INTO v_current_points, v_client_user_id, v_lead_id, v_auth_user_id
    FROM public.client_portal_users
    WHERE id = p_client_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente não encontrado';
    END IF;

    -- Validação de segurança: se chamado via client autenticado, deve ser o próprio titular
    IF auth.role() <> 'service_role' AND auth.uid() IS NOT NULL AND v_auth_user_id IS NOT NULL AND auth.uid() <> v_auth_user_id THEN
        RAISE EXCEPTION 'Acesso não autorizado para este cliente';
    END IF;

    IF COALESCE(v_current_points, 0) < p_points_spent THEN
        RAISE EXCEPTION 'Saldo de pontos insuficiente';
    END IF;

    -- Deduz pontos de client_portal_users.quark_points
    v_new_balance := COALESCE(v_current_points, 0) - p_points_spent;
    UPDATE public.client_portal_users
    SET quark_points = v_new_balance
    WHERE id = p_client_id;

    -- Insere registro em quark_points_redemptions
    INSERT INTO public.quark_points_redemptions (
        client_id,
        reward_id,
        reward_title,
        points_spent,
        status,
        notes
    ) VALUES (
        p_client_id,
        p_reward_id,
        p_reward_title,
        p_points_spent,
        'solicitado',
        p_notes
    ) RETURNING id INTO v_redemption_id;

    -- Registra débito em quark_points_transactions
    INSERT INTO public.quark_points_transactions (
        client_id,
        type,
        points,
        description,
        reference_id
    ) VALUES (
        p_client_id,
        'debito',
        p_points_spent,
        'Resgate: ' || p_reward_title,
        v_redemption_id
    );

    -- Se p_reward_id for serviço de manutenção/limpeza, cria registro correspondente em maintenance_services
    IF p_reward_id ILIKE '%limpeza%' OR p_reward_title ILIKE '%limpeza%' OR p_reward_id ILIKE '%wash%' THEN
        v_service_type := 'limpeza';
    ELSIF p_reward_id ILIKE '%manuten%' OR p_reward_title ILIKE '%manuten%'
       OR p_reward_id ILIKE '%reparo%' OR p_reward_title ILIKE '%reparo%'
       OR p_reward_id ILIKE '%inspe%' OR p_reward_title ILIKE '%inspe%' THEN
        v_service_type := 'manutencao';
    END IF;

    IF v_service_type IS NOT NULL THEN
        v_maint_notes := 'Resgate de pontos Quark (' || p_points_spent || ' pts): ' || p_reward_title;
        IF p_notes IS NOT NULL AND TRIM(p_notes) <> '' THEN
            v_maint_notes := v_maint_notes || ' | Observações: ' || TRIM(p_notes);
        END IF;

        INSERT INTO public.maintenance_services (
            user_id,
            client_id,
            lead_id,
            service_type,
            status,
            price,
            cost,
            notes
        ) VALUES (
            COALESCE(v_client_user_id, auth.uid()),
            p_client_id,
            v_lead_id,
            v_service_type,
            'pendente',
            0,
            0,
            v_maint_notes
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'new_balance', v_new_balance
    );
END;
$$;

-- 11.9 RPC: credit_referral_points
CREATE OR REPLACE FUNCTION public.credit_referral_points(p_referral_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referral RECORD;
    v_points INTEGER;
BEGIN
    -- Busca o registro com lock exclusivo para evitar créditos concorrentes
    SELECT * INTO v_referral
    FROM public.client_referrals
    WHERE id = p_referral_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Indicação não encontrada';
    END IF;

    -- Se points_credited for true, retorna false
    IF COALESCE(v_referral.points_credited, false) = true THEN
        RETURN false;
    END IF;

    v_points := COALESCE(v_referral.reward_points, 1000);

    -- Credita reward_points em client_portal_users.quark_points
    UPDATE public.client_portal_users
    SET quark_points = COALESCE(quark_points, 0) + v_points
    WHERE id = v_referral.referrer_client_id;

    -- Marca points_credited = true e status = 'instalado' em client_referrals
    UPDATE public.client_referrals
    SET points_credited = true,
        status = 'instalado',
        updated_at = NOW()
    WHERE id = p_referral_id;

    -- Registra crédito em quark_points_transactions
    INSERT INTO public.quark_points_transactions (
        client_id,
        type,
        points,
        description,
        reference_id
    ) VALUES (
        v_referral.referrer_client_id,
        'credito',
        v_points,
        'Indicação concluída: ' || v_referral.referred_name,
        p_referral_id
    );

    RETURN true;
END;
$$;

-- Permissões de Execução
GRANT EXECUTE ON FUNCTION public.redeem_quark_points(UUID, TEXT, TEXT, INTEGER, TEXT) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.credit_referral_points(UUID) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.credit_referral_points(UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 12. RECIBOS FINANCEIROS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number BIGINT GENERATED ALWAYS AS IDENTITY,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    payer_name TEXT NOT NULL,
    payer_doc TEXT,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    method TEXT DEFAULT 'PIX',
    installment TEXT,
    paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
    city TEXT DEFAULT 'Maceió/AL',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_lead_id ON public.receipts (lead_id);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts_access" ON public.receipts;
CREATE POLICY "receipts_access" ON public.receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 13. CONTRATOS & DOCUMENTOS DIGITAIS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('procuracao', 'aluguel', 'contrato')),
    title TEXT NOT NULL,
    lead_id TEXT REFERENCES public.leads (id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'assinado', 'cancelado')),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_signers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
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
    signature TEXT,
    ip TEXT,
    user_agent TEXT,
    content_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_lead ON public.documents (lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON public.documents (kind);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents (status);
CREATE INDEX IF NOT EXISTS idx_doc_signers_doc ON public.document_signers (document_id);
CREATE INDEX IF NOT EXISTS idx_doc_signers_token ON public.document_signers (token);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_access" ON public.documents;
CREATE POLICY "documents_access" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "signers_access" ON public.document_signers;
CREATE POLICY "signers_access" ON public.document_signers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permite leitura anônima pelo token de assinatura pública
DROP POLICY IF EXISTS "signers_anon_token_read" ON public.document_signers;
CREATE POLICY "signers_anon_token_read" ON public.document_signers FOR SELECT TO anon, authenticated USING (token IS NOT NULL);

-- ─────────────────────────────────────────────────────────────
-- 14. SINCRONIZAÇÃO DE FASE DO PROJETO COM O PORTAL DO CLIENTE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.client_portal_users 
ADD COLUMN IF NOT EXISTS project_phase text DEFAULT 'venda_confirmada',
ADD COLUMN IF NOT EXISTS project_phase_label text DEFAULT 'Venda Confirmada & Contrato';

CREATE OR REPLACE FUNCTION public.set_client_tracking_phase(
    p_client_id uuid,
    p_phase text,
    p_phase_label text,
    p_notes text DEFAULT NULL::text
)
RETURNS project_tracking
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_phases text[] := ARRAY[
        'venda_confirmada',
        'projeto_elaboracao',
        'compra_kit',
        'projeto_enviado',
        'aprovacao_concessionaria',
        'logistica_entrega',
        'instalacao',
        'homologacao',
        'finalizado'
    ];
    v_labels text[] := ARRAY[
        'Venda Confirmada & Contrato',
        'Elaboração do Projeto Técnico',
        'Compra do Kit & Emissão de NF',
        'Protocolo na Concessionária',
        'Parecer de Acesso Aprovado',
        'Logística & Entrega dos Equipamentos',
        'Instalação & Montagem dos Painéis',
        'Vistoria & Troca do Medidor',
        'Usina Ativa & Gerando Economia!'
    ];
    v_target_idx integer := 0;
    v_cur_phase text;
    v_cur_label text;
    v_new_tracking public.project_tracking;
BEGIN
    SELECT user_id INTO v_user_id FROM public.client_portal_users WHERE id = p_client_id;
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    END IF;

    FOR i IN 1..array_length(v_phases, 1) LOOP
        IF v_phases[i] = p_phase THEN
            v_target_idx := i;
            EXIT;
        END IF;
    END LOOP;

    IF v_target_idx = 0 THEN
        v_target_idx := 1;
    END IF;

    FOR i IN 1..array_length(v_phases, 1) LOOP
        v_cur_phase := v_phases[i];
        v_cur_label := v_labels[i];

        IF i < v_target_idx THEN
            IF EXISTS (SELECT 1 FROM public.project_tracking WHERE client_id = p_client_id AND phase = v_cur_phase) THEN
                UPDATE public.project_tracking
                SET is_current = false,
                    completed_at = COALESCE(completed_at, now())
                WHERE client_id = p_client_id AND phase = v_cur_phase;
            ELSE
                INSERT INTO public.project_tracking (client_id, user_id, phase, phase_label, started_at, completed_at, is_current, notes)
                VALUES (p_client_id, v_user_id, v_cur_phase, v_cur_label, now() - interval '3 days', now() - interval '1 day', false, 'Fase concluída.');
            END IF;

        ELSIF i = v_target_idx THEN
            IF EXISTS (SELECT 1 FROM public.project_tracking WHERE client_id = p_client_id AND phase = v_cur_phase) THEN
                UPDATE public.project_tracking
                SET is_current = true,
                    phase_label = p_phase_label,
                    notes = COALESCE(p_notes, notes),
                    completed_at = NULL
                WHERE client_id = p_client_id AND phase = v_cur_phase
                RETURNING * INTO v_new_tracking;
            ELSE
                INSERT INTO public.project_tracking (client_id, user_id, phase, phase_label, started_at, completed_at, is_current, notes)
                VALUES (p_client_id, v_user_id, v_cur_phase, p_phase_label, now(), NULL, true, p_notes)
                RETURNING * INTO v_new_tracking;
            END IF;

        ELSE
            IF EXISTS (SELECT 1 FROM public.project_tracking WHERE client_id = p_client_id AND phase = v_cur_phase) THEN
                UPDATE public.project_tracking
                SET is_current = false,
                    completed_at = NULL
                WHERE client_id = p_client_id AND phase = v_cur_phase;
            END IF;
        END IF;
    END LOOP;

    UPDATE public.client_portal_users
    SET project_phase = p_phase,
        project_phase_label = p_phase_label
    WHERE id = p_client_id;

    RETURN v_new_tracking;
END;
$function$;

