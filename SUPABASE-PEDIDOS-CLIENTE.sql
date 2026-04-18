-- HUSKY CAIXA | APP DO CLIENTE + PEDIDOS ONLINE
-- Execute este arquivo APÓS o SUPABASE-SETUP.sql base.

create extension if not exists pgcrypto;

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

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  order_number text not null,
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
  order_status text not null default 'Recebido',
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

alter table public.customer_catalog_items enable row level security;
alter table public.customer_orders enable row level security;

-- Catálogo público para o app do cliente.
do $$ begin
  create policy customer_catalog_public_read on public.customer_catalog_items
    for select to anon, authenticated
    using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy customer_catalog_authenticated_insert on public.customer_catalog_items
    for insert to authenticated
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy customer_catalog_authenticated_update on public.customer_catalog_items
    for update to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy customer_catalog_authenticated_delete on public.customer_catalog_items
    for delete to authenticated
    using (true);
exception when duplicate_object then null; end $$;

-- Pedidos: cliente envia sem login; equipe lê e atualiza autenticada.
do $$ begin
  create policy customer_orders_public_insert on public.customer_orders
    for insert to anon, authenticated
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy customer_orders_authenticated_select on public.customer_orders
    for select to authenticated
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy customer_orders_authenticated_update on public.customer_orders
    for update to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy customer_orders_authenticated_delete on public.customer_orders
    for delete to authenticated
    using (true);
exception when duplicate_object then null; end $$;

-- Atualização automática do updated_at.
drop trigger if exists trg_customer_catalog_touch_updated_at on public.customer_catalog_items;
create trigger trg_customer_catalog_touch_updated_at
before update on public.customer_catalog_items
for each row execute function public.husky_touch_updated_at();

drop trigger if exists trg_customer_orders_touch_updated_at on public.customer_orders;
create trigger trg_customer_orders_touch_updated_at
before update on public.customer_orders
for each row execute function public.husky_touch_updated_at();

-- Realtime opcional para o painel de pedidos.
do $$ begin
  alter publication supabase_realtime add table public.customer_orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.customer_catalog_items;
exception when duplicate_object then null; end $$;
