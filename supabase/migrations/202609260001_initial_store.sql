create extension if not exists pgcrypto;

create type public.order_status as enum ('pending_payment', 'payment_review', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('For Her', 'For Him', 'Unisex', 'Oud & Attar', 'Discovery Sets')),
  price_paise integer not null check (price_paise > 0),
  compare_at_paise integer check (compare_at_paise is null or compare_at_paise >= price_paise),
  size text not null,
  concentration text not null,
  notes text[] not null default '{}',
  description text not null,
  image_url text,
  accent text not null default '#ad7045',
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  email text not null,
  phone text not null,
  shipping_address jsonb not null,
  subtotal_paise integer not null check (subtotal_paise > 0),
  shipping_paise integer not null default 0 check (shipping_paise >= 0),
  tax_paise integer not null default 0 check (tax_paise >= 0),
  tax_included boolean not null default false,
  total_paise integer not null check (total_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status public.order_status not null default 'pending_payment',
  payment_status public.payment_status not null default 'created',
  payment_provider text not null default 'razorpay',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  payment_signature_verified_at timestamptz,
  tracking_carrier text,
  tracking_number text,
  tracking_url text,
  inventory_reserved_until timestamptz not null default (now() + interval '20 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text not null,
  size text not null,
  unit_price_paise integer not null check (unit_price_paise > 0),
  quantity integer not null check (quantity > 0 and quantity <= 20),
  line_total_paise integer not null check (line_total_paise = unit_price_paise * quantity)
);

create table public.webhook_events (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.order_lookup_limits (
  ip_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now()
);

create table public.order_notification_events (
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('order_confirmation', 'payment_review', 'shipment_update', 'refund_update')),
  sent_at timestamptz,
  primary key (order_id, event_type)
);

create index products_active_featured_idx on public.products (featured desc, created_at desc) where active = true;
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status, payment_status);
create index order_items_order_id_idx on public.order_items (order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.webhook_events enable row level security;
alter table public.order_lookup_limits enable row level security;
alter table public.order_notification_events enable row level security;

create policy "Anyone can view active products"
  on public.products for select
  to anon, authenticated
  using (active = true);

-- Orders and payment events are written only by the trusted server using the service role.
-- Keep service-role credentials out of browser code and public environment variables.

create or replace function public.release_order_inventory(order_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.orders set status = 'cancelled', payment_status = 'failed', updated_at = now()
    where id = order_uuid and status = 'pending_payment' and inventory_reserved_until < now();
  get diagnostics changed = row_count;
  if changed = 0 then return false; end if;
  update public.products p set stock = p.stock + oi.quantity, updated_at = now()
    from public.order_items oi where oi.order_id = order_uuid and oi.product_id = p.id;
  return true;
end;
$$;

revoke all on function public.release_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.release_order_inventory(uuid) to service_role;

create or replace function public.release_expired_order_inventory()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired record;
  released integer := 0;
begin
  for expired in select id from public.orders
    where status = 'pending_payment' and inventory_reserved_until < now()
    order by inventory_reserved_until limit 200
  loop
    if public.release_order_inventory(expired.id) then released := released + 1; end if;
  end loop;
  return released;
end;
$$;

revoke all on function public.release_expired_order_inventory() from public, anon, authenticated;
grant execute on function public.release_expired_order_inventory() to service_role;

create or replace function public.create_pending_order(customer jsonb, cart jsonb, shipping_rate integer, free_shipping_threshold integer, tax_rate_bps integer, pricing_tax_mode text)
returns table (created_order_id uuid, created_order_number text, created_subtotal_paise integer, created_shipping_paise integer, created_tax_paise integer, created_total_paise integer, reserved_items jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested record;
  product_row public.products%rowtype;
  new_id uuid := gen_random_uuid();
  new_number text := 'FLX-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || upper(encode(gen_random_bytes(6), 'hex'));
  total integer := 0;
  subtotal integer := 0;
  shipping_amount integer := 0;
  tax_amount integer := 0;
  is_tax_included boolean := false;
  lines jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(cart) <> 'array' or jsonb_array_length(cart) = 0 or jsonb_array_length(cart) > 20 then
    raise exception 'Invalid cart';
  end if;
  if shipping_rate is null or shipping_rate < 0 or shipping_rate > 10000000
    or (free_shipping_threshold is not null and free_shipping_threshold < 1)
    or pricing_tax_mode not in ('none', 'inclusive', 'exclusive')
    or tax_rate_bps is null or tax_rate_bps < 0 or tax_rate_bps > 10000 then
    raise exception 'Invalid checkout pricing settings';
  end if;
  if coalesce(length(trim(customer->>'name')), 0) < 2
    or coalesce(length(trim(customer->>'email')), 0) < 5
    or coalesce(length(trim(customer->>'phone')), 0) < 8
    or jsonb_typeof(customer->'address') <> 'object' then
    raise exception 'Invalid customer details';
  end if;

  for requested in
    select (entry->>'id')::uuid as id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(cart) entry
    group by (entry->>'id')::uuid
    order by (entry->>'id')::uuid
  loop
    if requested.quantity < 1 or requested.quantity > 20 then raise exception 'Invalid quantity'; end if;
    select * into product_row from public.products p
      where p.id = requested.id and p.active = true for update;
    if not found or product_row.stock < requested.quantity then
      raise exception 'A product is unavailable or out of stock';
    end if;
    update public.products set stock = stock - requested.quantity, updated_at = now() where id = requested.id;
    subtotal := subtotal + product_row.price_paise * requested.quantity;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'product_id', product_row.id,
      'product_name', product_row.name,
      'product_slug', product_row.slug,
      'size', product_row.size,
      'unit_price_paise', product_row.price_paise,
      'quantity', requested.quantity,
      'line_total_paise', product_row.price_paise * requested.quantity
    ));
  end loop;

  shipping_amount := case when free_shipping_threshold is not null and subtotal >= free_shipping_threshold then 0 else shipping_rate end;
  is_tax_included := pricing_tax_mode = 'inclusive';
  tax_amount := case
    when pricing_tax_mode = 'none' then 0
    when pricing_tax_mode = 'inclusive' then round(subtotal::numeric * tax_rate_bps / (10000 + tax_rate_bps))::integer
    else round(subtotal::numeric * tax_rate_bps / 10000)::integer
  end;
  total := subtotal + shipping_amount + case when is_tax_included then 0 else tax_amount end;
  if subtotal <= 0 or total > 200000000 then raise exception 'Invalid order total'; end if;
  insert into public.orders (
    id, order_number, customer_name, email, phone, shipping_address,
    subtotal_paise, shipping_paise, tax_paise, tax_included, total_paise, inventory_reserved_until
  ) values (
    new_id, new_number, trim(customer->>'name'), lower(trim(customer->>'email')),
    trim(customer->>'phone'), customer->'address', subtotal, shipping_amount, tax_amount, is_tax_included, total, now() + interval '20 minutes'
  );

  insert into public.order_items (order_id, product_id, product_name, product_slug, size, unit_price_paise, quantity, line_total_paise)
  select new_id, item.product_id, item.product_name, item.product_slug, item.size,
    item.unit_price_paise, item.quantity, item.line_total_paise
  from jsonb_to_recordset(lines) as item (
    product_id uuid, product_name text, product_slug text, size text,
    unit_price_paise integer, quantity integer, line_total_paise integer
  );

  return query select new_id, new_number, subtotal, shipping_amount, tax_amount, total, lines;
end;
$$;

revoke all on function public.create_pending_order(jsonb, jsonb, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.create_pending_order(jsonb, jsonb, integer, integer, integer, text) to service_role;

create or replace function public.cancel_pending_order(order_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.orders set status = 'cancelled', payment_status = 'failed', updated_at = now()
    where id = order_uuid and status = 'pending_payment' and payment_status in ('created', 'authorized', 'failed');
  get diagnostics changed = row_count;
  if changed = 0 then return false; end if;
  update public.products p set stock = p.stock + oi.quantity, updated_at = now()
    from public.order_items oi where oi.order_id = order_uuid and oi.product_id = p.id;
  return true;
end;
$$;

revoke all on function public.cancel_pending_order(uuid) from public, anon, authenticated;
grant execute on function public.cancel_pending_order(uuid) to service_role;

create or replace function public.mark_order_paid(local_order_uuid uuid, provider_order_id text, provider_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.orders set status = 'paid', payment_status = 'captured',
    razorpay_payment_id = provider_payment_id, payment_signature_verified_at = now(), updated_at = now()
    where id = local_order_uuid and razorpay_order_id = provider_order_id
      and status = 'pending_payment' and payment_status in ('created', 'authorized');
  get diagnostics changed = row_count;
  if changed = 0 then
    update public.orders set status = 'payment_review', payment_status = 'captured',
      razorpay_payment_id = provider_payment_id, payment_signature_verified_at = now(), updated_at = now()
      where id = local_order_uuid and razorpay_order_id = provider_order_id
        and status = 'cancelled' and payment_status = 'failed';
    get diagnostics changed = row_count;
  end if;
  return changed = 1;
end;
$$;

revoke all on function public.mark_order_paid(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text, text) to service_role;

create or replace function public.consume_order_lookup(ip_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempts integer;
begin
  insert into public.order_lookup_limits (ip_hash, attempts, window_started_at)
    values (ip_key, 1, now())
  on conflict (ip_hash) do update set
    attempts = case when public.order_lookup_limits.window_started_at < now() - interval '15 minutes'
      then 1 else public.order_lookup_limits.attempts + 1 end,
    window_started_at = case when public.order_lookup_limits.window_started_at < now() - interval '15 minutes'
      then now() else public.order_lookup_limits.window_started_at end
  returning attempts into current_attempts;
  return current_attempts <= 10;
end;
$$;

revoke all on function public.consume_order_lookup(text) from public, anon, authenticated;
grant execute on function public.consume_order_lookup(text) to service_role;
