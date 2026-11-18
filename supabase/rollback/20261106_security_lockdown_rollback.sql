-- ROLLBACK de 20261106_security_lockdown.sql
-- ATENÇÃO: reabre as falhas de segurança. Use só em emergência, e por pouco tempo.
-- Funções provision_client_portal_user / trg_auto_provision_client_portal / sync_opportunity_to_client_portal:
--   reaplique as versões de supabase/migrations/20261105_client_portal_auto_provisioning_and_crm_sync.sql.

-- 1. Policies removidas/alteradas (definições originais, snapshot de 2026-11-06)
CREATE POLICY backend_anon_access_client_intelligence ON public.client_intelligence FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY backend_anon_access_client_portal_users ON public.client_portal_users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY financial_anon_all ON public.financial_transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY leads_anon_all ON public.leads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY maintenance_services_anon_all ON public.maintenance_services FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY opportunities_anon_all ON public.opportunities FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY backend_anon_access_project_tracking ON public.project_tracking FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY receipts_anon_read ON public.receipts FOR SELECT TO anon USING (true);
CREATE POLICY support_tickets_anon_all ON public.support_tickets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY tasks_anon_all ON public.tasks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY ticket_messages_anon_all ON public.ticket_messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY backend_anon_access_utility_invoices ON public.utility_invoices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY opportunities_read_active ON public.opportunities FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY leads_read_active ON public.leads FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY client_portal_users_read_active ON public.client_portal_users FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY proposals_all_access ON public.proposals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY quark_profiles_auth ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS products_portal_read ON public.products;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['activities','document_signers','documents','financial','lead_pipelines','lead_tags','leads',
    'maintenance_alerts','maintenance_services','opportunities','pipelines','products','projects','proposals',
    'support_tickets','tags','tasks','ticket_messages','utility_invoices']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'quark_' || t || '_auth', CASE t WHEN 'financial' THEN 'financial_transactions' ELSE t END);
  END LOOP;
END $$;

ALTER POLICY quark_team_access_client_intelligence ON public.client_intelligence USING (true) WITH CHECK (true);
ALTER POLICY quark_team_access_client_portal_users ON public.client_portal_users USING (true) WITH CHECK (true);
ALTER POLICY quark_receipts_auth ON public.receipts USING (true) WITH CHECK (true);
ALTER POLICY profiles_team_select ON public.profiles USING (true);
ALTER POLICY prolabore_all ON public.prolabore_settlements TO public USING (true) WITH CHECK (true);
ALTER POLICY social_accounts_all ON public.social_accounts TO public USING (true) WITH CHECK (true);
ALTER POLICY social_posts_all ON public.social_posts TO public USING (true) WITH CHECK (true);
ALTER POLICY documents_auth_all ON public.documents
  USING ((( SELECT auth.uid()) = user_id) OR (user_id IS NULL)) WITH CHECK ((( SELECT auth.uid()) = user_id) OR (user_id IS NULL));
ALTER POLICY document_signers_auth_all ON public.document_signers
  USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_signers.document_id AND (d.user_id = (SELECT auth.uid()) OR d.user_id IS NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_signers.document_id AND (d.user_id = (SELECT auth.uid()) OR d.user_id IS NULL)));
ALTER POLICY client_portal_users_tenant_access ON public.client_portal_users
  USING (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = auth_user_id) OR ((SELECT auth.role()) = 'authenticated'))
  WITH CHECK (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = auth_user_id) OR ((SELECT auth.role()) = 'authenticated'));

-- 2. Triggers de guarda
DROP TRIGGER IF EXISTS trg_guard_client_portal_users ON public.client_portal_users;
DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_client_portal_users();
DROP FUNCTION IF EXISTS public.guard_profile_role();

-- 3. Funções originais
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new.id, new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'vendedor'))
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;
    RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN (
    COALESCE((auth.jwt() ->> 'email') IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com'), false)
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') ILIKE '%admin%', false)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
        AND (role ILIKE '%admin%' OR email IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com')))
    OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()
        AND (email IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com') OR raw_user_meta_data->>'role' ILIKE '%admin%'))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_client_portal_user(p_auth_id uuid, p_cpf text, p_name text, p_email text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_clean_cpf TEXT; v_existing_id UUID; v_opp_id UUID; v_phone TEXT; v_owner_user_id UUID;
BEGIN
    v_clean_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');
    SELECT id, phone, user_id INTO v_opp_id, v_phone, v_owner_user_id FROM public.opportunities
    WHERE regexp_replace(COALESCE(cpf_cnpj, ''), '[^0-9]', '', 'g') = v_clean_cpf AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_existing_id FROM public.client_portal_users
    WHERE regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = v_clean_cpf LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        UPDATE public.client_portal_users SET auth_user_id = p_auth_id, email = p_email,
            name = COALESCE(NULLIF(p_name, ''), name), phone = COALESCE(phone, v_phone),
            opportunity_id = COALESCE(opportunity_id, v_opp_id), user_id = COALESCE(user_id, v_owner_user_id),
            is_active = true, last_login = NOW()
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO public.client_portal_users (auth_user_id, cpf, name, email, phone, opportunity_id, user_id, is_active, last_login)
        VALUES (p_auth_id, p_cpf, p_name, p_email, v_phone, v_opp_id, v_owner_user_id, true, NOW());
    END IF;
    RETURN TRUE;
END;
$function$;

-- get_financial_dre_summary original: bloco de autorização era
--   IF p_user_id IS NOT NULL THEN SELECT EXISTS(profiles admin p_user_id) OR is_admin() INTO v_is_admin; ELSE v_is_admin := TRUE; END IF;
-- get_client_auth_email / provision_all_client_portal_users originais: idênticos às versões novas,
--   trocando public._provision_client_portal_user(x, NULL) por public.provision_client_portal_user(x)
--   e removendo o guard is_admin() de provision_all.

DROP FUNCTION IF EXISTS public._provision_client_portal_user(uuid, text);

GRANT EXECUTE ON FUNCTION public.redeem_quark_points(uuid, text, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_client_tracking(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.dba_cleanup_duplicates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_all_client_portal_users() TO authenticated;
