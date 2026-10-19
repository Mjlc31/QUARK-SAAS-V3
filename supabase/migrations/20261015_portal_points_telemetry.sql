-- ============================================================
-- 2026-10-15 — Quark Points, Indicações e Resgates de Benefícios
-- Portal do Cliente & Gamificação Solar
-- Idempotente: pode rodar com segurança múltiplas vezes.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABELA: client_referrals (Indicações de Clientes)
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 2. TABELA: quark_points_transactions (Extrato de Pontos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quark_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('credito','debito')),
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 3. TABELA: quark_points_redemptions (Resgates de Benefícios)
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 4. TRIGGERS: updated_at e auto-preenchimento de user_id
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS) & POLÍTICAS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 7. REALTIME
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_referrals;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quark_points_transactions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quark_points_redemptions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. RPC: redeem_quark_points
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 9. RPC: credit_referral_points
-- ─────────────────────────────────────────────────────────────
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
