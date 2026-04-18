-- HUSKY CAIXA | APP DO CLIENTE + PEDIDOS ONLINE (VERSÃO LOGIN + ETAPAS)
-- Execute este arquivo APÓS o SUPABASE-SETUP.sql base.

create extension if not exists pgcrypto;

create or replace function public.husky_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.husky_current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), '');
$$;

create or replace function public.husky_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.husky_current_profile_role() in ('Administrador', 'Gestão', 'Operacional');
$$;

create table if not exists public.customer_catalog_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  product_id text not null,
  name text not null,
  short_name text,
  category text,
  description text,
  unit text,
  price numeric(12,2) not null default 0,
  image_url text,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, product_id)
);

create table if not exists public.public_storefront_settings (
  workspace_id text primary key,
  store_name text,
  store_subtitle text,
  hero_title text,
  hero_text text,
  pix_key text,
  pix_copy_paste text,
  pix_qr_image text,
  catalog_layout text not null default 'compact',
  checkout_requires_login boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  order_number text not null,
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  customer_document text,
  delivery_type text not null default 'Entrega',
  delivery_address text,
  delivery_neighborhood text,
  delivery_reference text,
  payment_method text not null default 'Pix',
  payment_status text not null default 'Aguardando pagamento',
  order_status text not null default 'Aguardando aceitar',
  status_stage text not null default 'aguardando_aceite',
  source text not null default 'App Cliente',
  notes text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  internal_notes text,
  imported_sale_id text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, order_number)
);

alter table public.customer_orders add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
alter table public.customer_orders add column if not exists status_stage text not null default 'aguardando_aceite';

update public.customer_orders
set status_stage = case
  when lower(coalesce(order_status, '')) like '%aguard%' then 'aguardando_aceite'
  when lower(coalesce(order_status, '')) like '%aceit%' then 'aceito'
  when lower(coalesce(order_status, '')) like '%confeit%' or lower(coalesce(order_status, '')) like '%produ%' then 'confeitando'
  when lower(coalesce(order_status, '')) like '%pronto%' then 'pronto'
  when lower(coalesce(order_status, '')) like '%saiu%' then 'saiu_entrega'
  when lower(coalesce(order_status, '')) like '%final%' then 'finalizado'
  when lower(coalesce(order_status, '')) like '%cancel%' then 'cancelado'
  when lower(coalesce(order_status, '')) like '%import%' then 'finalizado'
  else coalesce(status_stage, 'aguardando_aceite')
end
where status_stage is null or status_stage = '';

alter table public.customer_catalog_items enable row level security;
alter table public.public_storefront_settings enable row level security;
alter table public.customer_orders enable row level security;

-- limpa políticas antigas para aplicar o novo modelo

drop policy if exists customer_catalog_public_read on public.customer_catalog_items;
drop policy if exists customer_catalog_authenticated_insert on public.customer_catalog_items;
drop policy if exists customer_catalog_authenticated_update on public.customer_catalog_items;
drop policy if exists customer_catalog_authenticated_delete on public.customer_catalog_items;
drop policy if exists storefront_public_read on public.public_storefront_settings;
drop policy if exists storefront_staff_write on public.public_storefront_settings;
drop policy if exists customer_orders_public_insert on public.customer_orders;
drop policy if exists customer_orders_authenticated_select on public.customer_orders;
drop policy if exists customer_orders_authenticated_update on public.customer_orders;
drop policy if exists customer_orders_authenticated_delete on public.customer_orders;
drop policy if exists customer_orders_customer_insert on public.customer_orders;
drop policy if exists customer_orders_customer_select_own on public.customer_orders;
drop policy if exists customer_orders_staff_select on public.customer_orders;
drop policy if exists customer_orders_staff_update on public.customer_orders;
drop policy if exists customer_orders_staff_delete on public.customer_orders;

create policy customer_catalog_public_read on public.customer_catalog_items
  for select to anon, authenticated
  using (active = true);

create policy customer_catalog_staff_write on public.customer_catalog_items
  for all to authenticated
  using (public.husky_is_staff())
  with check (public.husky_is_staff());

create policy storefront_public_read on public.public_storefront_settings
  for select to anon, authenticated
  using (true);

create policy storefront_staff_write on public.public_storefront_settings
  for all to authenticated
  using (public.husky_is_staff())
  with check (public.husky_is_staff());

create policy customer_orders_customer_insert on public.customer_orders
  for insert to authenticated
  with check (
    customer_user_id = auth.uid()
    and workspace_id is not null
  );

create policy customer_orders_customer_select_own on public.customer_orders
  for select to authenticated
  using (customer_user_id = auth.uid());

create policy customer_orders_staff_select on public.customer_orders
  for select to authenticated
  using (public.husky_is_staff());

create policy customer_orders_staff_update on public.customer_orders
  for update to authenticated
  using (public.husky_is_staff())
  with check (public.husky_is_staff());

create policy customer_orders_staff_delete on public.customer_orders
  for delete to authenticated
  using (public.husky_is_staff());

-- Atualização automática do updated_at.
drop trigger if exists trg_customer_catalog_touch_updated_at on public.customer_catalog_items;
create trigger trg_customer_catalog_touch_updated_at
before update on public.customer_catalog_items
for each row execute function public.husky_touch_updated_at();

drop trigger if exists trg_storefront_touch_updated_at on public.public_storefront_settings;
create trigger trg_storefront_touch_updated_at
before update on public.public_storefront_settings
for each row execute function public.husky_touch_updated_at();

drop trigger if exists trg_customer_orders_touch_updated_at on public.customer_orders;
create trigger trg_customer_orders_touch_updated_at
before update on public.customer_orders
for each row execute function public.husky_touch_updated_at();

-- Realtime opcional.
do $$ begin
  alter publication supabase_realtime add table public.customer_orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.customer_catalog_items;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.public_storefront_settings;
exception when duplicate_object then null; end $$;
