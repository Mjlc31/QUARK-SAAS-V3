create table if not exists public.settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb
);

insert into public.settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;
