-- ============================================================
-- 2026-10-07 — CRM por serviço, rastreamento de propostas,
-- captura pública direto no CRM e ferramentas (documentos).
--
-- Idempotente: pode rodar mais de uma vez no SQL Editor do Supabase.
-- As funções públicas leem colunas via to_jsonb(...) para não quebrar
-- se alguma coluna opcional não existir no banco.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. OPPORTUNITIES: dados da venda por tipo de serviço
-- ─────────────────────────────────────────────────────────────
alter table public.opportunities add column if not exists segment text;            -- serviço principal (solar, save, eletroposto, manutencao, projeto, gestao)
alter table public.opportunities add column if not exists services text[] default '{}'; -- todos os serviços de interesse
alter table public.opportunities add column if not exists source text;             -- origem (Instagram, Indicação, Anamnese…)
alter table public.opportunities add column if not exists temperature text;        -- frio | morno | quente
alter table public.opportunities add column if not exists avg_bill numeric;        -- conta de luz média (R$)
alter table public.opportunities add column if not exists consumption_kwh numeric;
alter table public.opportunities add column if not exists tariff numeric;
alter table public.opportunities add column if not exists connection_type text;
alter table public.opportunities add column if not exists roof_type text;
alter table public.opportunities add column if not exists notes text;
alter table public.opportunities add column if not exists anamnese jsonb;          -- respostas completas da anamnese / landing
alter table public.opportunities add column if not exists email text;
alter table public.opportunities add column if not exists cpf_cnpj text;
alter table public.opportunities add column if not exists birth_date date;
alter table public.opportunities add column if not exists system_power numeric;
alter table public.opportunities add column if not exists installation_date date;
alter table public.opportunities add column if not exists address text;
alter table public.opportunities add column if not exists latitude numeric;
alter table public.opportunities add column if not exists longitude numeric;
alter table public.opportunities add column if not exists loss_reason text;
alter table public.opportunities add column if not exists next_action_date date;
alter table public.opportunities add column if not exists next_action_text text;
alter table public.opportunities add column if not exists updated_at timestamptz default now();

create index if not exists idx_opportunities_segment on public.opportunities(segment);

-- ─────────────────────────────────────────────────────────────
-- 2. PROPOSTAS: histórico de visualizações
-- ─────────────────────────────────────────────────────────────
alter table public.proposals add column if not exists view_count integer not null default 0;
alter table public.proposals add column if not exists viewed_at timestamptz;

create table if not exists public.proposal_views (
  id uuid primary key default gen_random_uuid(),
  proposal_id text not null,
  session_id text,
  viewed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  device text,
  user_agent text,
  referrer text,
  internal boolean not null default false -- aberta pela própria equipe (logada) ou para exportar PDF
);
create index if not exists idx_proposal_views_proposal on public.proposal_views(proposal_id, viewed_at desc);

alter table public.proposal_views enable row level security;
drop policy if exists proposal_views_team_read on public.proposal_views;
create policy proposal_views_team_read on public.proposal_views for select to authenticated using (true);

do $$ begin
  alter publication supabase_realtime add table public.proposal_views;
exception when others then null; end $$;

-- Registra uma abertura da proposta. Recarregar a página na mesma sessão
-- em menos de 30 min não conta como nova visualização.
create or replace function public.register_proposal_view(
  p_token text,
  p_session text default null,
  p_device text default null,
  p_user_agent text default null,
  p_referrer text default null,
  p_internal boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop jsonb;
  v_pid text;
  v_view uuid;
  v_count integer;
  v_last timestamptz;
  v_lead text;
  v_owner uuid;
begin
  select to_jsonb(p) into v_prop from public.proposals p where p.public_token = p_token limit 1;
  if v_prop is null then
    return null;
  end if;
  v_pid := v_prop ->> 'id';

  -- Mesma sessão, recente: reaproveita a visualização.
  select id into v_view from public.proposal_views
   where proposal_id = v_pid and session_id = p_session and p_session is not null
     and last_seen_at > now() - interval '30 minutes'
   order by viewed_at desc limit 1;
  if v_view is not null then
    update public.proposal_views set last_seen_at = now() where id = v_view;
    return v_view;
  end if;

  select max(viewed_at) into v_last from public.proposal_views where proposal_id = v_pid and not internal;

  insert into public.proposal_views (proposal_id, session_id, device, user_agent, referrer, internal)
  values (v_pid, left(p_session, 80), left(p_device, 40), left(p_user_agent, 400), left(p_referrer, 400), coalesce(p_internal, false))
  returning id into v_view;

  if coalesce(p_internal, false) then
    return v_view;
  end if;

  select count(*) into v_count from public.proposal_views where proposal_id = v_pid and not internal;

  begin
    update public.proposals
       set view_count = v_count,
           viewed_at = coalesce(viewed_at, now())
     where public_token = p_token;
    update public.proposals set status = 'visualizada' where public_token = p_token and status = 'enviada';
  exception when others then null;
  end;

  -- Linha do tempo do CRM: primeira abertura e retornos (intervalo > 3 h).
  v_lead := v_prop ->> 'lead_id';
  begin
    v_owner := coalesce(nullif(v_prop ->> 'created_by', ''), nullif(v_prop ->> 'user_id', ''))::uuid;
  exception when others then v_owner := null;
  end;
  if v_lead is not null and v_owner is not null and (v_last is null or v_last < now() - interval '3 hours') then
    begin
      insert into public.agent_notes (entity_type, entity_id, note, created_by_ai, user_id)
      values (
        'opportunity', v_lead::uuid,
        case when v_count = 1
          then '👀 Cliente abriu a proposta #' || coalesce(v_prop ->> 'number', '') || ' pela primeira vez' || coalesce(' (' || p_device || ')', '') || '.'
          else '🔁 Cliente voltou a abrir a proposta #' || coalesce(v_prop ->> 'number', '') || ' — ' || v_count || 'ª visualização' || coalesce(' (' || p_device || ')', '') || '.'
        end,
        true, v_owner
      );
    exception when others then null;
    end;
  end if;

  return v_view;
end;
$$;

-- Atualiza o tempo de leitura (heartbeat da página pública).
create or replace function public.ping_proposal_view(p_view uuid, p_seconds integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.proposal_views
     set duration_seconds = greatest(duration_seconds, least(coalesce(p_seconds, 0), 4 * 3600)),
         last_seen_at = now()
   where id = p_view;
$$;

revoke all on function public.register_proposal_view(text, text, text, text, text, boolean) from public;
revoke all on function public.ping_proposal_view(uuid, integer) from public;
grant execute on function public.register_proposal_view(text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.ping_proposal_view(uuid, integer) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. PROPOSTA PÚBLICA: cliente vem do CRM (opportunities) ou de leads
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_public_proposal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop jsonb;
  v_lead jsonb;
  v_seller jsonb;
  v_settings jsonb;
begin
  select to_jsonb(p) into v_prop from public.proposals p where p.public_token = p_token limit 1;
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

  return jsonb_build_object(
    'proposal', jsonb_build_object(
      'id', v_prop -> 'id', 'number', v_prop -> 'number', 'title', v_prop -> 'title', 'status', v_prop -> 'status',
      -- custos internos (kit, mão de obra, comissão, imposto, lucro...) nunca saem do banco
      'inputs', coalesce(v_prop -> 'inputs', '{}'::jsonb) - array['kitPrice', 'laborPerModule', 'electricalPerKwp', 'extraCosts',
                                 'commission', 'tax', 'profit', 'discount', 'roundTo', 'notes'],
      'final_price', v_prop -> 'final_price', 'power_kwp', v_prop -> 'power_kwp', 'valid_until', v_prop -> 'valid_until',
      'created_at', v_prop -> 'created_at', 'accepted_at', v_prop -> 'accepted_at', 'accepted_by', v_prop -> 'accepted_by'
    ),
    'lead', v_lead,
    'seller', coalesce(v_seller, '{}'::jsonb),
    'settings', coalesce(v_settings, '{}'::jsonb)
  );
end;
$$;

create or replace function public.accept_public_proposal(p_token text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop jsonb;
  v_name text := left(coalesce(nullif(trim(p_name), ''), 'Cliente'), 120);
  v_owner uuid;
begin
  select to_jsonb(p) into v_prop from public.proposals p
   where p.public_token = p_token
     and coalesce(p.status, '') not in ('aceita', 'recusada')
     and (p.valid_until is null or p.valid_until >= current_date);
  if v_prop is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.proposals set status = 'aceita', accepted_at = now(), accepted_by = v_name where public_token = p_token;

  begin
    v_owner := coalesce(nullif(v_prop ->> 'created_by', ''), nullif(v_prop ->> 'user_id', ''))::uuid;
    insert into public.agent_notes (entity_type, entity_id, note, created_by_ai, user_id)
    values ('opportunity', (v_prop ->> 'lead_id')::uuid, '✅ Proposta #' || coalesce(v_prop ->> 'number', '') || ' aceita online por ' || v_name || '.', true, v_owner);
  exception when others then null;
  end;

  return jsonb_build_object('ok', true, 'id', v_prop -> 'id');
end;
$$;

revoke all on function public.get_public_proposal(text) from public;
revoke all on function public.accept_public_proposal(text, text) from public;
grant execute on function public.get_public_proposal(text) to anon, authenticated;
grant execute on function public.accept_public_proposal(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. CAPTURA PÚBLICA → CRM (anamnese, bio do Instagram, funil)
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_crm_lead(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(trim(coalesce(p ->> 'name', '')), 120);
  v_phone text := left(trim(coalesce(p ->> 'phone', '')), 30);
  v_digits text := regexp_replace(coalesce(p ->> 'phone', ''), '\D', '', 'g');
  v_email text := lower(left(nullif(trim(p ->> 'email'), ''), 160));
  v_services text[];
  v_segment text;
  v_source text := left(coalesce(nullif(trim(p ->> 'source'), ''), 'Site'), 40);
  v_owner uuid;
  v_id uuid;
  v_existing uuid;
  v_temp text := case when p ->> 'temperature' in ('frio', 'morno', 'quente') then p ->> 'temperature' else 'morno' end;
  v_note text;
begin
  -- Robôs preenchem o campo escondido "website".
  if coalesce(trim(p ->> 'website'), '') <> '' then
    return jsonb_build_object('ok', true);
  end if;
  if v_name = '' or length(v_digits) < 10 then
    raise exception 'nome e telefone são obrigatórios';
  end if;

  select coalesce(array_agg(s), '{}') into v_services
    from jsonb_array_elements_text(coalesce(p -> 'services', '[]'::jsonb)) s
   where s in ('solar', 'save', 'eletroposto', 'manutencao', 'projeto', 'gestao');
  v_segment := coalesce(nullif(p ->> 'segment', ''), v_services[1], 'solar');
  if v_segment = 'ambos' then
    v_segment := 'solar';
    v_services := array_append(array_append(v_services, 'solar'), 'save');
  end if;
  if not (v_segment = any(v_services)) then
    v_services := array_prepend(v_segment, v_services);
  end if;

  -- Dono do lead: vendedor do link (?v=) ou o primeiro usuário da conta.
  begin
    select id into v_owner from auth.users where id = nullif(p ->> 'owner', '')::uuid;
  exception when others then v_owner := null;
  end;
  if v_owner is null then
    select id into v_owner from auth.users order by created_at asc limit 1;
  end if;

  v_note := concat_ws(E'\n',
    '📥 Lead recebido via ' || v_source || '.',
    nullif(trim(p ->> 'summary'), '')
  );

  -- Mesmo telefone já no CRM: completa o cadastro em vez de duplicar.
  select id into v_existing from public.opportunities
   where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits
      or (v_email is not null and lower(email) = v_email)
   order by created_at desc limit 1;

  if v_existing is not null then
    update public.opportunities set
      email = coalesce(email, v_email),
      city = coalesce(nullif(trim(p ->> 'city'), ''), city),
      address = coalesce(nullif(trim(p ->> 'address'), ''), address),
      segment = coalesce(segment, v_segment),
      services = (select array_agg(distinct x) from unnest(coalesce(services, '{}') || v_services) x),
      avg_bill = coalesce(nullif(p ->> 'avg_bill', '')::numeric, avg_bill),
      consumption_kwh = coalesce(nullif(p ->> 'consumption_kwh', '')::numeric, consumption_kwh),
      roof_type = coalesce(nullif(trim(p ->> 'roof_type'), ''), roof_type),
      connection_type = coalesce(nullif(trim(p ->> 'connection_type'), ''), connection_type),
      temperature = case when v_temp = 'quente' then 'quente' else coalesce(temperature, v_temp) end,
      anamnese = coalesce(anamnese, '{}'::jsonb) || coalesce(p -> 'answers', '{}'::jsonb),
      notes = left(concat_ws(E'\n\n', nullif(notes, ''), nullif(trim(p ->> 'notes'), '')), 8000),
      updated_at = now()
    where id = v_existing;
    v_id := v_existing;
    v_note := '🔁 Cliente preencheu novamente (' || v_source || '). ' || coalesce(nullif(trim(p ->> 'summary'), ''), '');
  else
    insert into public.opportunities (
      title, phone, email, city, address, status, amount, segment, services, source, temperature,
      avg_bill, consumption_kwh, roof_type, connection_type, notes, anamnese, user_id
    ) values (
      v_name, v_phone, v_email,
      left(nullif(trim(p ->> 'city'), ''), 80),
      left(nullif(trim(p ->> 'address'), ''), 200),
      'Lead', 0, v_segment, v_services, v_source, v_temp,
      nullif(p ->> 'avg_bill', '')::numeric,
      nullif(p ->> 'consumption_kwh', '')::numeric,
      left(nullif(trim(p ->> 'roof_type'), ''), 60),
      left(nullif(trim(p ->> 'connection_type'), ''), 20),
      left(nullif(trim(p ->> 'notes'), ''), 8000),
      coalesce(p -> 'answers', '{}'::jsonb),
      v_owner
    ) returning id into v_id;
  end if;

  begin
    insert into public.agent_notes (entity_type, entity_id, note, created_by_ai, user_id)
    values ('opportunity', v_id, v_note, true, v_owner);
  exception when others then null;
  end;

  return jsonb_build_object('ok', true, 'id', v_id, 'updated', v_existing is not null);
end;
$$;

revoke all on function public.create_crm_lead(jsonb) from public;
grant execute on function public.create_crm_lead(jsonb) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. FERRAMENTAS: procuração, contrato, recibo e nota de serviço
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tool_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('procuracao', 'aluguel', 'recibo', 'nota_servico')),
  title text not null,
  number integer,
  opportunity_id text,
  data jsonb not null default '{}'::jsonb,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tool_documents_kind on public.tool_documents(kind, created_at desc);

alter table public.tool_documents enable row level security;
drop policy if exists tool_documents_owner on public.tool_documents;
create policy tool_documents_owner on public.tool_documents for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
