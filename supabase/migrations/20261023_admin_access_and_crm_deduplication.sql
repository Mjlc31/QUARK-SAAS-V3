-- ==============================================================================
-- QUARK SAAS V3 - PARIDADE DE ADMINISTRAÇÃO E DEDUPLICAÇÃO DE LEADS/OPORTUNIDADES
-- Project: sumydaewtszecrvdgoku (QUARK SAAS V3)
-- Date: 2026-10-23
-- ==============================================================================

-- 1. ATUALIZAÇÃO DE METADATA DO USUÁRIO ANDERSON ALVES
-- Garante que auth.users.raw_user_meta_data contenha role: 'Admin'
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "Admin", "name": "Anderson Alves"}'::jsonb
WHERE id = 'e80a490d-1f62-4282-9d66-b9034c0d823c';

-- 2. FUNÇÃO SECURITY DEFINER IS_ADMIN E IS_TEAM_MEMBER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    COALESCE((auth.jwt() ->> 'email') IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com'), false)
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') ILIKE '%admin%', false)
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND (role ILIKE '%admin%' OR email IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com'))
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND (email IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com') OR raw_user_meta_data->>'role' ILIKE '%admin%')
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean AS $$
BEGIN
  RETURN (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND role NOT ILIKE '%client%'
    )
    OR COALESCE((auth.jwt() ->> 'email') IN ('projetos@quarkenergia.com.br'), false)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. POLÍTICAS RLS PERMISSIVAS PARA ADMINS (TOTAL PARIDADE ENTRE ARTHUR E ANDERSON)
CREATE POLICY "admin_all_project_tracking" ON public.project_tracking
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_projects" ON public.projects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_financial_transactions" ON public.financial_transactions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_proposals" ON public.proposals
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_opportunities" ON public.opportunities
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_leads" ON public.leads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_client_portal_users" ON public.client_portal_users
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_client_intelligence" ON public.client_intelligence
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_activities" ON public.activities
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_agent_notes" ON public.agent_notes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_support_tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_tool_documents" ON public.tool_documents
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_documents" ON public.documents
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. ATUALIZAÇÃO DO RPC DE DRE FINANCEIRO (AGREGAÇÃO GLOBAL PARA ADMINS)
CREATE OR REPLACE FUNCTION public.get_financial_dre_summary(
    p_user_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_start DATE := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
    v_end DATE := COALESCE(p_end_date, CURRENT_DATE);
    v_dre JSONB;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    IF p_user_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = p_user_id AND (role ILIKE '%admin%' OR email IN ('arthurmoraesp12@gmail.com', 'ctt.andersonalves@gmail.com'))
        ) OR public.is_admin() INTO v_is_admin;
    ELSE
        v_is_admin := TRUE;
    END IF;

    SELECT jsonb_build_object(
        'receita_bruta', COALESCE(SUM(amount) FILTER (WHERE type = 'receita'), 0),
        'rec_residencial', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category = 'instalacao_residencial'), 0),
        'rec_comercial', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category = 'instalacao_comercial'), 0),
        'rec_manutencao', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category = 'manutencao'), 0),
        'rec_outros', COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND category NOT IN ('instalacao_residencial', 'instalacao_comercial', 'manutencao')), 0),
        
        'cpv_equipamentos', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'equipamentos'), 0),
        'cpv_mao_obra', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'mao_de_obra'), 0),
        'cpv_frete', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category = 'frete'), 0),
        'cpv_outros', COALESCE(SUM(amount) FILTER (WHERE type = 'custo' AND category NOT IN ('equipamentos', 'mao_de_obra', 'frete')), 0),
        
        'desp_salarios', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'salarios'), 0),
        'desp_marketing', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'marketing'), 0),
        'desp_aluguel', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'aluguel'), 0),
        'desp_combustivel', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'combustivel'), 0),
        'desp_software', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'software'), 0),
        'desp_outras', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category NOT IN ('salarios', 'marketing', 'aluguel', 'combustivel', 'software', 'imposto')), 0),
        'impostos', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND category = 'imposto'), 0),
        
        'total_receita', COALESCE(SUM(amount) FILTER (WHERE type = 'receita'), 0),
        'total_custo', COALESCE(SUM(amount) FILTER (WHERE type = 'custo'), 0),
        'total_despesa', COALESCE(SUM(amount) FILTER (WHERE type = 'despesa'), 0),
        'count_receita', COUNT(*) FILTER (WHERE type = 'receita'),
        'count_custo', COUNT(*) FILTER (WHERE type = 'custo'),
        'count_despesa', COUNT(*) FILTER (WHERE type = 'despesa')
    ) INTO v_dre
    FROM public.financial_transactions
    WHERE deleted_at IS NULL
      AND (v_is_admin OR user_id = p_user_id)
      AND (p_start_date IS NULL OR date >= p_start_date)
      AND (p_end_date IS NULL OR date <= p_end_date);
    
    RETURN v_dre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. DEDUPLICAÇÃO DE OPORTUNIDADES E LEADS COM RE-PARENTING AUTOMÁTICO
DO $$
DECLARE
  r RECORD;
  keeper_uuid UUID;
  dup_uuid UUID;
BEGIN
  FOR r IN (
    SELECT 
      lower(trim(title)) as norm_title,
      array_agg(id ORDER BY 
        CASE status 
          WHEN 'Ganho' THEN 1 
          WHEN 'Proposta' THEN 2 
          WHEN 'Qualificado' THEN 3 
          ELSE 4 
        END,
        CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 2 END,
        CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 ELSE 2 END,
        updated_at DESC
      ) as sorted_ids
    FROM public.opportunities
    WHERE deleted_at IS NULL
    GROUP BY lower(trim(title))
    HAVING count(*) > 1
  ) LOOP
    keeper_uuid := r.sorted_ids[1];
    
    FOR i IN 2..array_length(r.sorted_ids, 1) LOOP
      dup_uuid := r.sorted_ids[i];
      
      -- Mescla dados ausentes no keeper
      UPDATE public.opportunities k
      SET 
        phone = COALESCE(NULLIF(k.phone, ''), NULLIF(d.phone, '')),
        email = COALESCE(NULLIF(k.email, ''), NULLIF(d.email, '')),
        cpf_cnpj = COALESCE(NULLIF(k.cpf_cnpj, ''), NULLIF(d.cpf_cnpj, '')),
        city = COALESCE(NULLIF(k.city, ''), NULLIF(d.city, '')),
        address = COALESCE(NULLIF(k.address, ''), NULLIF(d.address, '')),
        source = COALESCE(NULLIF(k.source, ''), NULLIF(d.source, '')),
        notes = CASE 
          WHEN k.notes IS NULL OR k.notes = '' THEN d.notes
          WHEN d.notes IS NOT NULL AND d.notes != '' AND d.notes != k.notes THEN k.notes || E'\n' || d.notes
          ELSE k.notes
        END,
        avg_bill = COALESCE(k.avg_bill, d.avg_bill),
        consumption_kwh = COALESCE(k.consumption_kwh, d.consumption_kwh),
        roof_type = COALESCE(k.roof_type, d.roof_type),
        connection_type = COALESCE(k.connection_type, d.connection_type),
        system_power = COALESCE(k.system_power, d.system_power),
        services = CASE 
          WHEN k.services IS NULL OR array_length(k.services, 1) = 0 THEN d.services 
          ELSE k.services 
        END
      FROM public.opportunities d
      WHERE k.id = keeper_uuid AND d.id = dup_uuid;

      -- Re-parenting de tabelas dependentes
      UPDATE public.proposals SET opportunity_id = keeper_uuid WHERE opportunity_id = dup_uuid;
      UPDATE public.client_portal_users SET opportunity_id = keeper_uuid, lead_id = keeper_uuid::text WHERE opportunity_id = dup_uuid OR lead_id = dup_uuid::text;
      UPDATE public.activities SET opportunity_id = keeper_uuid, lead_id = keeper_uuid::text WHERE opportunity_id = dup_uuid OR lead_id = dup_uuid::text;
      UPDATE public.project_tracking SET opportunity_id = keeper_uuid WHERE opportunity_id = dup_uuid;
      UPDATE public.financial_transactions SET opportunity_id = keeper_uuid WHERE opportunity_id = dup_uuid;
      UPDATE public.documents SET opportunity_id = keeper_uuid WHERE opportunity_id = dup_uuid;
      UPDATE public.support_tickets SET opportunity_id = keeper_uuid WHERE opportunity_id = dup_uuid;
      UPDATE public.maintenance_services SET opportunity_id = keeper_uuid, lead_id = keeper_uuid::text WHERE opportunity_id = dup_uuid OR lead_id = dup_uuid::text;
      UPDATE public.client_intelligence SET lead_id = keeper_uuid::text WHERE lead_id = dup_uuid::text;
      UPDATE public.lead_pipelines SET lead_id = keeper_uuid::text WHERE lead_id = dup_uuid::text;
      UPDATE public.lead_tags SET lead_id = keeper_uuid::text WHERE lead_id = dup_uuid::text;

      -- Soft delete do registro redundante
      UPDATE public.opportunities SET deleted_at = NOW() WHERE id = dup_uuid;
      UPDATE public.leads SET deleted_at = NOW() WHERE id = dup_uuid::text;
    END LOOP;
  END LOOP;
END $$;
