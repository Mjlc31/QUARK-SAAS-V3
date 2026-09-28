-- ============================================================
-- 20260827_patch_missing_columns.sql
-- Fixes missing columns based on recent frontend integrations
-- ============================================================

-- 1. `pipelines` table needs a `stages` JSONB column. 
-- Context: `CrmContext.tsx` inserts pipelines with `stages` array.
ALTER TABLE public.pipelines 
ADD COLUMN IF NOT EXISTS stages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. `proposals` table needs `lead_id`. 
-- Context: `CrmContext.tsx` queries `proposals` using `.eq('lead_id', leadId)`.
-- We must allow it to be NULL because `Proposals.tsx` creates proposals without explicit lead_id initially.
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL;

-- 3. Ensure `user_id` on `financial_transactions` is correctly linked
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Re-apply missing RLS policies
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
CREATE POLICY "proposals_select" ON public.proposals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
CREATE POLICY "proposals_insert" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "proposals_update" ON public.proposals;
CREATE POLICY "proposals_update" ON public.proposals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;
CREATE POLICY "proposals_delete" ON public.proposals FOR DELETE USING (auth.uid() = user_id);
