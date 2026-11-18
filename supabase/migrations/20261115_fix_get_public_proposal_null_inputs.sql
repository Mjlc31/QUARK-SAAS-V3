-- Link público quebrava (22023 "cannot delete from scalar") em proposta sem inputs:
-- to_jsonb(p) -> 'inputs' devolve o JSON null (não o NULL do SQL), o coalesce parava nele e o "- array[...]" estourava.
-- Mesma função de produção; só o nullif() na linha do v_inputs.
CREATE OR REPLACE FUNCTION public.get_public_proposal(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_prop jsonb;
  v_lead jsonb;
  v_seller jsonb;
  v_settings jsonb;
  v_inputs jsonb;
begin
  select to_jsonb(p) into v_prop from public.proposals p where p.public_token = p_token and p.deleted_at is null limit 1;
  if v_prop is null then
    return null;
  end if;

  begin
    select to_jsonb(o) into v_lead from public.opportunities o where o.id::text = v_prop ->> 'lead_id';
  exception when others then v_lead := null;
  end;
  if v_lead is not null then
    v_lead := jsonb_build_object('name', coalesce(v_lead ->> 'title', 'Cliente'), 'city', v_lead ->> 'city', 'state', v_lead ->> 'state', 'address', v_lead ->> 'address');
  else
    begin
      select to_jsonb(l) into v_lead from public.leads l where l.id::text = v_prop ->> 'lead_id';
    exception when others then v_lead := null;
    end;
    v_lead := jsonb_build_object(
      'name', coalesce(v_lead ->> 'name', v_lead -> 'data' ->> 'name', v_prop ->> 'client_name', 'Cliente'),
      'city', coalesce(v_lead ->> 'city', v_prop ->> 'city'),
      'state', coalesce(v_lead ->> 'state', v_prop ->> 'state'),
      'address', coalesce(v_lead ->> 'address', v_prop ->> 'address')
    );
  end if;

  begin
    select jsonb_build_object('name', to_jsonb(pr) ->> 'full_name', 'email', to_jsonb(pr) ->> 'email', 'phone', to_jsonb(pr) ->> 'phone')
      into v_seller from public.profiles pr where pr.id::text = coalesce(v_prop ->> 'created_by', v_prop ->> 'user_id');
  exception when others then v_seller := null;
  end;

  select s.data - array['notify_emails', 'defaults', 'integrations', 'cadence'] into v_settings from public.settings s where s.id = 1;

  v_inputs := coalesce(nullif(v_prop -> 'inputs', 'null'::jsonb), nullif(v_prop -> 'data' -> 'inputs', 'null'::jsonb), '{}'::jsonb) - array['kitPrice', 'laborPerModule', 'electricalPerKwp', 'extraCosts', 'commission', 'tax', 'profit', 'discount', 'roundTo', 'notes'];

  return jsonb_build_object(
    'proposal', jsonb_build_object(
      'id', v_prop -> 'id', 'number', v_prop -> 'number', 'title', v_prop -> 'title', 'status', v_prop -> 'status',
      'inputs', v_inputs,
      'final_price', v_prop -> 'final_price',
      'power_kwp', coalesce(v_prop -> 'power_kwp', to_jsonb((v_inputs ->> 'modulePowerW')::numeric * (v_inputs ->> 'moduleQty')::numeric / 1000.0)),
      'valid_until', v_prop -> 'valid_until',
      'created_at', v_prop -> 'created_at', 'accepted_at', v_prop -> 'accepted_at', 'accepted_by', v_prop -> 'accepted_by'
    ),
    'lead', v_lead,
    'seller', coalesce(v_seller, '{}'::jsonb),
    'settings', coalesce(v_settings, '{}'::jsonb)
  );
end;
$function$;
