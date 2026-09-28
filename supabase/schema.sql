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
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    cpf TEXT,
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

-- Custom policies for portal users (auth_user_id based)
DROP POLICY IF EXISTS "client_portal_users_select" ON public.client_portal_users;
CREATE POLICY "client_portal_users_select" ON public.client_portal_users FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "client_portal_users_update" ON public.client_portal_users;
CREATE POLICY "client_portal_users_update" ON public.client_portal_users FOR UPDATE USING (auth.uid() = auth_user_id);

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
