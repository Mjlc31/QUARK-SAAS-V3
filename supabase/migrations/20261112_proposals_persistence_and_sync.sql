-- Migration: Proposals Persistence and CRM Sync RPCs
-- Date: 2026-11-12
-- Author: Quark System

-- 1. RPC para salvar propostas com sincronização atômica de oportunidade
CREATE OR REPLACE FUNCTION public.save_proposal(p_proposal jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_id text;
  v_lead_id text;
  v_opp_id uuid;
  v_user_id uuid;
  v_inputs jsonb;
  v_data jsonb;
  v_title text;
  v_client_name text;
  v_city text;
  v_phone text;
  v_power_kwp numeric;
  v_monthly_generation numeric;
  v_direct_cost numeric;
  v_commission_value numeric;
  v_tax_value numeric;
  v_profit_value numeric;
  v_final_price numeric;
  v_status text;
  v_valid_until timestamptz;
  v_public_token text;
  v_existing proposals%ROWTYPE;
  v_result proposals%ROWTYPE;
BEGIN
  -- 1. Extração e sanitização dos dados
  v_id := p_proposal->>'id';
  v_lead_id := p_proposal->>'lead_id';
  
  -- Resolve UUID da oportunidade se válido
  IF p_proposal ? 'opportunity_id' AND p_proposal->>'opportunity_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_opp_id := (p_proposal->>'opportunity_id')::uuid;
  ELSIF v_lead_id IS NOT NULL AND v_lead_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_opp_id := v_lead_id::uuid;
  END IF;

  -- Valida se oportunidade realmente existe no banco
  IF v_opp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM opportunities WHERE id = v_opp_id) THEN
    v_opp_id := NULL;
  END IF;

  -- Resolve user_id do autor
  IF p_proposal ? 'user_id' AND p_proposal->>'user_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_user_id := (p_proposal->>'user_id')::uuid;
  ELSE
    v_user_id := COALESCE(auth.uid(), '7dacc88f-9ebd-4710-a1be-0647841db24a'::uuid);
  END IF;

  v_inputs := p_proposal->'inputs';
  v_data := COALESCE(p_proposal->'data', '{}'::jsonb);
  IF v_inputs IS NOT NULL AND NOT (v_data ? 'inputs') THEN
    v_data := v_data || jsonb_build_object('inputs', v_inputs);
  END IF;

  v_title := p_proposal->>'title';
  v_client_name := COALESCE(p_proposal->>'client_name', v_data->>'clientName', v_data->'lead'->>'name', 'Cliente');
  v_city := COALESCE(p_proposal->>'city', v_data->>'city', v_data->'lead'->>'city');
  v_phone := COALESCE(p_proposal->>'phone', v_data->>'phone', v_data->'lead'->>'phone');
  
  v_power_kwp := COALESCE((p_proposal->>'power_kwp')::numeric, (v_data->>'power_kwp')::numeric, 0);
  v_monthly_generation := COALESCE((p_proposal->>'monthly_generation')::numeric, (v_data->>'monthly_generation')::numeric, 0);
  v_direct_cost := COALESCE((p_proposal->>'direct_cost')::numeric, 0);
  v_commission_value := COALESCE((p_proposal->>'commission_value')::numeric, 0);
  v_tax_value := COALESCE((p_proposal->>'tax_value')::numeric, 0);
  v_profit_value := COALESCE((p_proposal->>'profit_value')::numeric, 0);
  v_final_price := COALESCE((p_proposal->>'final_price')::numeric, 0);
  v_status := COALESCE(p_proposal->>'status', 'enviada');

  IF p_proposal ? 'valid_until' AND p_proposal->>'valid_until' IS NOT NULL THEN
    BEGIN
      v_valid_until := (p_proposal->>'valid_until')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      v_valid_until := NOW() + interval '10 days';
    END;
  ELSE
    v_valid_until := NOW() + interval '10 days';
  END IF;

  -- 2. Atualização ou Inserção
  IF v_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM proposals WHERE id = v_id;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE proposals SET
      lead_id = COALESCE(v_lead_id, v_existing.lead_id),
      opportunity_id = COALESCE(v_opp_id, v_existing.opportunity_id),
      title = COALESCE(v_title, v_existing.title),
      client_name = COALESCE(v_client_name, v_existing.client_name),
      city = COALESCE(v_city, v_existing.city),
      phone = COALESCE(v_phone, v_existing.phone),
      inputs = COALESCE(v_inputs, v_existing.inputs),
      data = v_data,
      power_kwp = v_power_kwp,
      system_size_kw = v_power_kwp,
      monthly_generation = v_monthly_generation,
      direct_cost = v_direct_cost,
      commission_value = v_commission_value,
      tax_value = v_tax_value,
      profit_value = v_profit_value,
      final_price = v_final_price,
      status = CASE WHEN p_proposal ? 'status' THEN v_status ELSE v_existing.status END,
      valid_until = v_valid_until,
      updated_at = NOW()
    WHERE id = v_id
    RETURNING * INTO v_result;
  ELSE
    IF v_id IS NULL OR length(v_id) = 0 THEN
      v_id := gen_random_uuid()::text;
    END IF;
    v_public_token := COALESCE(p_proposal->>'public_token', encode(gen_random_bytes(16), 'hex'));

    INSERT INTO proposals (
      id,
      lead_id,
      opportunity_id,
      user_id,
      created_by,
      title,
      client_name,
      city,
      phone,
      inputs,
      data,
      power_kwp,
      system_size_kw,
      monthly_generation,
      direct_cost,
      commission_value,
      tax_value,
      profit_value,
      final_price,
      status,
      valid_until,
      public_token,
      created_at,
      updated_at
    ) VALUES (
      v_id,
      v_lead_id,
      v_opp_id,
      v_user_id,
      v_user_id,
      v_title,
      v_client_name,
      v_city,
      v_phone,
      v_inputs,
      v_data,
      v_power_kwp,
      v_power_kwp,
      v_monthly_generation,
      v_direct_cost,
      v_commission_value,
      v_tax_value,
      v_profit_value,
      v_final_price,
      v_status,
      v_valid_until,
      v_public_token,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_result;
  END IF;

  -- 3. Sincronização atômica com CRM (Opportunity)
  IF v_result.opportunity_id IS NOT NULL AND v_final_price > 0 THEN
    BEGIN
      UPDATE opportunities SET
        amount = v_final_price,
        system_power = v_power_kwp,
        updated_at = NOW()
      WHERE id = v_result.opportunity_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END IF;
  END IF;

  RETURN to_jsonb(v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_proposal(jsonb) TO anon, authenticated, service_role;

-- 2. RPC para buscar propostas ordenadas pela última alteração
CREATE OR REPLACE FUNCTION public.get_proposals(p_limit int DEFAULT 100)
RETURNS SETOF public.proposals
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT * 
  FROM public.proposals 
  WHERE deleted_at IS NULL 
  ORDER BY updated_at DESC NULLS LAST, created_at DESC 
  LIMIT COALESCE(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_proposals(int) TO anon, authenticated, service_role;
