create or replace function public.create_public_lead(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_lead public.leads;
  v_phone text := left(trim(p ->> 'phone'), 30);
  v_email text := lower(left(nullif(trim(p ->> 'email'), ''), 160));
  v_lead uuid;
  v_owner uuid;
begin
  if coalesce(trim(p ->> 'name'), '') = '' or coalesce(v_phone, '') = '' then
    raise exception 'nome e telefone são obrigatórios';
  end if;

  -- Vendedor que enviou o link (?v=): só vale para um usuário ativo da equipe.
  begin
    select id into v_owner from public.profiles where id = nullif(p ->> 'owner', '')::uuid and active;
  exception when others then
    v_owner := null;
  end;

  -- Anamnese enviada para um lead que já existe (?l=): completa o cadastro em vez de duplicar.
  begin
    v_lead := nullif(p ->> 'lead_id', '')::uuid;
  exception when others then
    v_lead := null;
  end;
  
  if v_lead is not null then
    update public.leads set
      email = coalesce(email, v_email),
      city = coalesce(city, left(nullif(trim(p ->> 'city'), ''), 80)),
      avg_bill = coalesce(nullif(p ->> 'avg_bill', '')::numeric, avg_bill),
      consumption_kwh = coalesce(nullif(p ->> 'consumption_kwh', '')::numeric, consumption_kwh),
      roof_type = coalesce(left(nullif(trim(p ->> 'roof_type'), ''), 60), roof_type),
      temperature = case when p ->> 'temperature' in ('frio', 'morno', 'quente') then p ->> 'temperature' else temperature end,
      notes = left(concat_ws(E'\n\n', nullif(notes, ''), nullif(trim(p ->> 'notes'), '')), 6000)
    where id = v_lead
    returning * into new_lead;
    if found then
      insert into public.activities (lead_id, type, content)
      values (new_lead.id, 'nota', 'Cliente respondeu a ' || coalesce(nullif(trim(p ->> 'source'), ''), 'pesquisa') || ' pelo link (Lead Atualizado)');
      return to_jsonb(new_lead) || jsonb_build_object('duplicate', false, 'updated', true);
    end if;
  end if;

  -- Checar por lead já existente (mesmo telefone ou email) independente do tempo
  select * into new_lead from public.leads
  where (regexp_replace(coalesce(phone, ''), '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g') or (v_email is not null and lower(email) = v_email))
  order by created_at desc limit 1;
  
  if found then
    -- Se for nos últimos 15 min, considerar duplo clique
    if new_lead.created_at > now() - interval '15 minutes' then
      return to_jsonb(new_lead) || jsonb_build_object('duplicate', true);
    end if;
    
    -- Lead antigo retornou pelo formulário! Atualizar e adicionar nota.
    update public.leads set
      temperature = 'quente',
      notes = left(concat_ws(E'\n\n', nullif(notes, ''), '--- Nova Simulação ---', nullif(trim(p ->> 'notes'), '')), 6000)
    where id = new_lead.id
    returning * into new_lead;
    
    insert into public.activities (lead_id, type, content)
    values (new_lead.id, 'nota', 'Lead retornou e preencheu o formulário novamente.');
    
    return to_jsonb(new_lead) || jsonb_build_object('duplicate', true, 'updated', true);
  end if;

  -- Se não existir, criar novo
  insert into public.leads (name, phone, email, city, state, address, avg_bill, consumption_kwh, source, notes, segment, roof_type, connection_type, temperature, owner_id)
  values (
    left(trim(p ->> 'name'), 120),
    v_phone,
    v_email,
    left(nullif(trim(p ->> 'city'), ''), 80),
    nullif(left(trim(p ->> 'state'), 2), ''),
    left(nullif(trim(p ->> 'address'), ''), 160),
    nullif(p ->> 'avg_bill', '')::numeric,
    nullif(p ->> 'consumption_kwh', '')::numeric,
    coalesce(nullif(trim(p ->> 'source'), ''), 'Captura'),
    left(nullif(trim(p ->> 'notes'), ''), 6000),
    left(nullif(trim(p ->> 'segment'), ''), 60),
    left(nullif(trim(p ->> 'roof_type'), ''), 60),
    case when p ->> 'connection_type' in ('monofasico', 'bifasico', 'trifasico', 'alta_tensao') then p ->> 'connection_type' else null end,
    case when p ->> 'temperature' in ('frio', 'morno', 'quente') then p ->> 'temperature' else 'morno' end,
    v_owner
  ) returning * into new_lead;

  insert into public.activities (lead_id, type, content)
  values (new_lead.id, 'nota', 'Lead capturado via formulário público' || case when v_owner is not null then ' (indicado por usuário)' else '' end);

  return to_jsonb(new_lead) || jsonb_build_object('duplicate', false, 'created', true);
end;
$$;
