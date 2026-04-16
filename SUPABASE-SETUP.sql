-- HUSKY CAIXA | ESTRUTURA MÍNIMA PARA LOGIN EM NUVEM E SINCRONIZAÇÃO
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  role text default 'Operacional',
  status text default 'Ativo',
  avatar_url text,
  updated_at timestamptz default now()
);

create table if not exists public.app_state_shared (
  workspace_id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.profiles enable row level security;
alter table public.app_state_shared enable row level security;

do $$ begin
  create policy profiles_select_authenticated on public.profiles
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_insert_authenticated on public.profiles
    for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_update_authenticated on public.profiles
    for update to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy shared_state_select_authenticated on public.app_state_shared
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy shared_state_insert_authenticated on public.app_state_shared
    for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy shared_state_update_authenticated on public.app_state_shared
    for update to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Atualiza o timestamp automaticamente.
create or replace function public.husky_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch_updated_at on public.profiles;
create trigger trg_profiles_touch_updated_at
before update on public.profiles
for each row execute function public.husky_touch_updated_at();

drop trigger if exists trg_app_state_touch_updated_at on public.app_state_shared;
create trigger trg_app_state_touch_updated_at
before update on public.app_state_shared
for each row execute function public.husky_touch_updated_at();

-- Realtime opcional: se falhar, o sistema continua sincronizando por polling.
alter publication supabase_realtime add table public.app_state_shared;


-- STORAGE PARA COMPROVANTES PIX (BUCKET PÚBLICO PARA PRÉ-VISUALIZAÇÃO ENTRE APARELHOS)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'husky-files',
  'husky-files',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy husky_files_public_read on storage.objects
    for select
    using (bucket_id = 'husky-files');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy husky_files_authenticated_insert on storage.objects
    for insert to authenticated
    with check (bucket_id = 'husky-files');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy husky_files_authenticated_update on storage.objects
    for update to authenticated
    using (bucket_id = 'husky-files')
    with check (bucket_id = 'husky-files');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy husky_files_authenticated_delete on storage.objects
    for delete to authenticated
    using (bucket_id = 'husky-files');
exception when duplicate_object then null; end $$;
