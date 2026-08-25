-- ============================================================
-- 20260820_consolidate_and_rls.sql
-- Unified Migration: Schema Fixes, FKs, and RLS Strict Policies
-- ============================================================

-- 1. Ensure id columns are TEXT for leads, tasks, projects, products
ALTER TABLE public.leads ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.tasks ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.projects ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.products ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.whatsapp_messages ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 2. Ensure lead_id in relational tables is TEXT for FK
ALTER TABLE public.lead_pipelines ALTER COLUMN lead_id TYPE TEXT USING lead_id::TEXT;
ALTER TABLE public.lead_tags ALTER COLUMN lead_id TYPE TEXT USING lead_id::TEXT;

-- 3. Restore Foreign Keys (TEXT -> TEXT)
ALTER TABLE public.lead_pipelines DROP CONSTRAINT IF EXISTS fk_lead_pipelines_lead_id;
ALTER TABLE public.lead_pipelines ADD CONSTRAINT fk_lead_pipelines_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.lead_tags DROP CONSTRAINT IF EXISTS fk_lead_tags_lead_id;
ALTER TABLE public.lead_tags ADD CONSTRAINT fk_lead_tags_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- 4. Add user_id column with DEFAULT auth.uid() to ALL multi-tenant tables
-- Leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.leads ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.products ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Pipelines
ALTER TABLE public.pipelines ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pipelines ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Tags
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tags ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Lead Pipelines
ALTER TABLE public.lead_pipelines ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.lead_pipelines ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Lead Tags
ALTER TABLE public.lead_tags ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.lead_tags ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Financial Transactions
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.financial_transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
-- WhatsApp Messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_messages ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 5. Drop ALL old permissive policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 6. Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

-- 7. Apply strict RLS policies (USING (auth.uid() = user_id))
-- Profiles
CREATE POLICY "Profiles: Users see own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Standard Multi-tenant Tables
CREATE POLICY "Leads: Strict user isolation" ON public.leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tasks: Strict user isolation" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Projects: Strict user isolation" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Products: Strict user isolation" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "LeadPipelines: Strict user isolation" ON public.lead_pipelines FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "LeadTags: Strict user isolation" ON public.lead_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Financial: Strict user isolation" ON public.financial_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "WhatsApp: Strict user isolation" ON public.whatsapp_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shared/Seeded Tables (Allow if user_id matches OR user_id is NULL for global presets)
CREATE POLICY "Pipelines: Strict user isolation or global" ON public.pipelines FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tags: Strict user isolation or global" ON public.tags FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id);

-- Landing Page Leads
CREATE POLICY "Landing leads: insert public" ON public.landing_page_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Landing leads: select authenticated" ON public.landing_page_leads FOR SELECT USING (auth.role() = 'authenticated');
