create or replace function public.get_public_proposal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'proposal', jsonb_build_object(
      'id', p.id, 'number', p.number, 'title', p.title, 'status', p.status,
      -- custos internos (kit, mão de obra, comissão, imposto, lucro...) nunca saem do banco
      'inputs', p.inputs - array['kitPrice', 'laborPerModule', 'electricalPerKwp', 'extraCosts',
                                 'commission', 'tax', 'profit', 'discount', 'roundTo', 'notes'],
      'final_price', p.final_price, 'power_kwp', p.power_kwp, 'valid_until', p.valid_until,
      'created_at', p.created_at, 'accepted_at', p.accepted_at, 'accepted_by', p.accepted_by
    ),
    'lead', jsonb_build_object('name', l.name, 'city', l.city, 'state', l.state, 'address', l.address),
    'seller', jsonb_build_object('name', pr.full_name, 'email', pr.email, 'phone', pr.phone),
    'settings', coalesce((select s.data - array['notify_emails', 'defaults', 'integrations', 'cadence'] from public.settings s where s.id = 1), '{}'::jsonb)
  )
  into result
  from public.proposals p
  join public.leads l on l.id = p.lead_id
  left join public.profiles pr on pr.id = p.created_by
  where p.public_token = p_token;

  return result;
end;
$$;

create or replace function public.track_proposal_view(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  update public.proposals
     set view_count = view_count + 1,
         viewed_at = coalesce(viewed_at, now()),
         status = case when status = 'enviada' then 'visualizada' else status end
   where public_token = p_token
  returning id, number, lead_id, view_count into rec;

  if rec.id is null then
    return null;
  end if;
  if rec.view_count = 1 then
    insert into public.activities (lead_id, type, content)
    values (rec.lead_id, 'proposta', 'Cliente abriu a proposta #' || rec.number);
  end if;
  return jsonb_build_object('first_view', rec.view_count = 1, 'id', rec.id);
end;
$$;

create or replace function public.accept_public_proposal(p_token text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  update public.proposals
     set status = 'aceita', accepted_at = now(), accepted_by = left(coalesce(nullif(trim(p_name), ''), 'Cliente'), 120)
   where public_token = p_token
     and status not in ('aceita', 'recusada')
     and (valid_until is null or valid_until >= current_date)
  returning id, number, lead_id into rec;

  if rec.id is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.leads set status = 'negociacao' where id = rec.lead_id and status in ('novo', 'contato', 'visita', 'proposta');
  insert into public.activities (lead_id, type, content)
  values (rec.lead_id, 'proposta', 'Proposta #' || rec.number || ' aceita online por ' || coalesce(nullif(trim(p_name), ''), 'Cliente'));
  return jsonb_build_object('ok', true, 'id', rec.id);
end;
$$;

-- Formulário público de captura de leads (site, Instagram, landing page).
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
      values (new_lead.id, 'nota', 'Cliente respondeu a ' || coalesce(nullif(trim(p ->> 'source'), ''), 'pesquisa') || ' pelo link');
      return to_jsonb(new_lead) || jsonb_build_object('duplicate', false, 'updated', true);
    end if;
  end if;

  -- Envio repetido (duplo clique, recarregar a página): devolve o mesmo lead, sem duplicar.
  select * into new_lead from public.leads
  where created_at > now() - interval '15 minutes'
    and (regexp_replace(coalesce(phone, ''), '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g') or (v_email is not null and lower(email) = v_email))
  order by created_at desc limit 1;
  if found then
    return to_jsonb(new_lead) || jsonb_build_object('duplicate', true);
  end if;

  insert into public.leads (name, phone, email, city, state, address, avg_bill, consumption_kwh, source, notes, segment, roof_type, connection_type, temperature, owner_id)
  values (
    left(trim(p ->> 'name'), 120),
    v_phone,
    v_email,
    left(nullif(trim(p ->> 'city'), ''), 80),
    upper(left(nullif(trim(p ->> 'state'), ''), 2)),
    left(nullif(trim(p ->> 'address'), ''), 200),
    nullif(p ->> 'avg_bill', '')::numeric,
    nullif(p ->> 'consumption_kwh', '')::numeric,
    left(coalesce(nullif(trim(p ->> 'source'), ''), 'Site'), 40),
    left(nullif(trim(p ->> 'notes'), ''), 2000),
    case when p ->> 'segment' in ('solar', 'save', 'ambos', 'eletroposto', 'manutencao', 'gestao') then p ->> 'segment' else 'solar' end,
    left(nullif(trim(p ->> 'roof_type'), ''), 60),
    case when p ->> 'connection_type' in ('mono', 'bi', 'tri') then p ->> 'connection_type' else null end,
    case when p ->> 'temperature' in ('frio', 'morno', 'quente') then p ->> 'temperature' else 'morno' end,
    v_owner
  )
  returning * into new_lead;

  insert into public.activities (lead_id, type, content)
  values (new_lead.id, 'nota', 'Lead recebido pelo formulário público' || coalesce(' (' || nullif(trim(p ->> 'source'), '') || ')', ''));

  return to_jsonb(new_lead) || jsonb_build_object('duplicate', false);
end;
$$;

-- Dados públicos da empresa para a página de captura (sem custos, margens ou configurações internas).
create or replace function public.get_public_company()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'company_name', data ->> 'company_name',
    'whatsapp', data ->> 'whatsapp',
    'instagram', data ->> 'instagram',
    'logo_url', data ->> 'logo_url',
    'city', data ->> 'city',
    'about', data ->> 'about',
    'tech_name', data ->> 'tech_name',
    'tech_registry', data ->> 'tech_registry',
    'warranty_modules_performance_years', data -> 'warranty_modules_performance_years',
    'tariff', data -> 'defaults' -> 'tariff',
    'sunHours', data -> 'defaults' -> 'sunHours',
    'fioBTariff', data -> 'defaults' -> 'fioBTariff',
    'publicLighting', data -> 'defaults' -> 'publicLighting',
    'gallery', data -> 'proposal' -> 'gallery',
    'capture', data -> 'capture',
    'metaPixelId', data -> 'integrations' ->> 'metaPixelId',
    'gaId', data -> 'integrations' ->> 'gaId'
  )
  from public.settings where id = 1;
$$;
revoke all on function public.get_public_company() from public;
grant execute on function public.get_public_company() to anon, authenticated;

-- Endereço do webhook de integrações (Zapier, Make, n8n…), usado pelo servidor ao receber leads.
create or replace function public.get_webhook_url()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(data -> 'integrations' ->> 'webhookUrl'), '') from public.settings where id = 1;
$$;
revoke all on function public.get_webhook_url() from public;
grant execute on function public.get_webhook_url() to anon, authenticated;

revoke all on function public.get_public_proposal(text) from public;
revoke all on function public.track_proposal_view(text) from public;
revoke all on function public.accept_public_proposal(text, text) from public;
grant execute on function public.get_public_proposal(text) to anon, authenticated;
grant execute on function public.track_proposal_view(text) to anon, authenticated;
grant execute on function public.accept_public_proposal(text, text) to anon, authenticated;
revoke all on function public.create_public_lead(jsonb) from public;
grant execute on function public.create_public_lead(jsonb) to anon, authenticated;

