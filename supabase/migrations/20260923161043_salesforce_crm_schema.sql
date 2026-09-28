-- ============================================================
--  MIGRATION: Salesforce-standard CRM Data Model
--  Features: Accounts, Contacts, Opportunities, Agent Notes, Evolution Messages
-- ============================================================

-- 1. ACCOUNTS (Empresas)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounts_select" ON public.accounts;
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "accounts_insert" ON public.accounts;
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "accounts_update" ON public.accounts;
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "accounts_delete" ON public.accounts;
CREATE POLICY "accounts_delete" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- 2. CONTACTS (Pessoas)
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
CREATE POLICY "contacts_select" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

-- 3. OPPORTUNITIES (Negócios)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Lead', 'Qualificado', 'Proposta', 'Ganho', 'Perdido')),
    amount NUMERIC(12, 2) DEFAULT 0.00,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "opportunities_select" ON public.opportunities;
CREATE POLICY "opportunities_select" ON public.opportunities FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "opportunities_insert" ON public.opportunities;
CREATE POLICY "opportunities_insert" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "opportunities_update" ON public.opportunities;
CREATE POLICY "opportunities_update" ON public.opportunities FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "opportunities_delete" ON public.opportunities;
CREATE POLICY "opportunities_delete" ON public.opportunities FOR DELETE USING (auth.uid() = user_id);

-- 4. AGENT_NOTES (Agentic AI insights)
CREATE TABLE IF NOT EXISTS public.agent_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    note TEXT NOT NULL,
    created_by_ai BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_notes_select" ON public.agent_notes;
CREATE POLICY "agent_notes_select" ON public.agent_notes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "agent_notes_insert" ON public.agent_notes;
CREATE POLICY "agent_notes_insert" ON public.agent_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "agent_notes_update" ON public.agent_notes;
CREATE POLICY "agent_notes_update" ON public.agent_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "agent_notes_delete" ON public.agent_notes;
CREATE POLICY "agent_notes_delete" ON public.agent_notes FOR DELETE USING (auth.uid() = user_id);

-- 5. EVOLUTION_MESSAGES (For WhatsApp integration)
CREATE TABLE IF NOT EXISTS public.evolution_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    from_me BOOLEAN NOT NULL DEFAULT FALSE,
    message_type TEXT DEFAULT 'text',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

ALTER TABLE public.evolution_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evolution_messages_select" ON public.evolution_messages;
CREATE POLICY "evolution_messages_select" ON public.evolution_messages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "evolution_messages_insert" ON public.evolution_messages;
CREATE POLICY "evolution_messages_insert" ON public.evolution_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "evolution_messages_update" ON public.evolution_messages;
CREATE POLICY "evolution_messages_update" ON public.evolution_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "evolution_messages_delete" ON public.evolution_messages;
CREATE POLICY "evolution_messages_delete" ON public.evolution_messages FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for foreign keys to improve query performance
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_account_id ON public.opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact_id ON public.opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_agent_notes_entity ON public.agent_notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evolution_messages_contact_id ON public.evolution_messages(contact_id);
