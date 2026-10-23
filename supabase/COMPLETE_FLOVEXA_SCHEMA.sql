-- ==============================================================================
-- FLOVEXA COMPLETE DATABASE SETUP & REPAIR SCRIPT
-- Run this once in the Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. EXTENSIONS & TYPES
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending_payment', 'payment_review', 'paid', 'processing',
      'shipped', 'delivered', 'cancelled', 'refunded'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum (
      'created', 'authorized', 'captured', 'failed', 'refunded'
    );
  end if;
end $$;

-- 2. SELLER PROFILES TABLE
create table if not exists public.seller_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_name text not null default '',
  status text not null default 'active' check (status in ('active', 'suspended')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Automatically create seller_profile rows for existing users with role = 'seller'
insert into public.seller_profiles (user_id, store_name)
select id, coalesce(nullif(raw_user_meta_data->>'store_name', ''), split_part(email, '@', 1), 'Seller')
from auth.users
where raw_app_meta_data->>'role' = 'seller'
on conflict (user_id) do nothing;

-- 3. PRODUCTS TABLE
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
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
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  seller_id uuid references public.seller_profiles(user_id) on delete set null
);

-- Ensure seller_id column exists if products was created previously
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='seller_id') then
    alter table public.products add column seller_id uuid references public.seller_profiles(user_id) on delete set null;
  end if;
end $$;

create index if not exists products_active_featured_idx on public.products (featured desc, created_at desc) where active = true;
create index if not exists products_seller_created_idx on public.products (seller_id, created_at desc) where seller_id is not null;

-- 4. ORDERS TABLE
create table if not exists public.orders (
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

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status, payment_status);

-- 5. ORDER ITEMS TABLE
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text not null,
  size text not null,
  unit_price_paise integer not null check (unit_price_paise > 0),
  quantity integer not null check (quantity > 0 and quantity <= 20),
  line_total_paise integer not null check (line_total_paise = unit_price_paise * quantity),
  seller_id uuid references public.seller_profiles(user_id) on delete set null
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_seller_order_idx on public.order_items (seller_id, order_id) where seller_id is not null;

-- 6. SELLER FULFILLMENTS TABLE
create table if not exists public.seller_fulfillments (
  seller_id uuid not null references public.seller_profiles(user_id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'paid' check (status in ('paid', 'processing', 'shipped', 'delivered')),
  tracking_carrier text,
  tracking_number text,
  tracking_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (seller_id, order_id)
);

create index if not exists seller_fulfillments_order_idx on public.seller_fulfillments (order_id);

-- 7. STORE CATEGORIES TABLE
create table if not exists public.store_categories (
  name text primary key check (char_length(name) between 2 and 60),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.store_categories (name, sort_order) values
  ('For Her', 10),
  ('For Him', 20),
  ('Unisex', 30),
  ('Oud & Attar', 40),
  ('Discovery Sets', 50)
on conflict (name) do nothing;

-- 8. STOREFRONT SETTINGS TABLE
create table if not exists public.storefront_settings (
  id text primary key check (id = 'home'),
  hero_image_url text not null default '' check (char_length(hero_image_url) <= 2048),
  announcement text not null default '' check (char_length(announcement) <= 120),
  eyebrow text not null default '' check (char_length(eyebrow) <= 100),
  title text not null default '' check (char_length(title) <= 80),
  title_emphasis text not null default '' check (char_length(title_emphasis) <= 80),
  description text not null default '' check (char_length(description) <= 360),
  cta_label text not null default '' check (char_length(cta_label) <= 50),
  caption_one text not null default '' check (char_length(caption_one) <= 100),
  caption_two text not null default '' check (char_length(caption_two) <= 100),
  updated_at timestamptz not null default now()
);

insert into public.storefront_settings (id, announcement, eyebrow, title, title_emphasis, description, cta_label, caption_one, caption_two)
values (
  'home',
  'A more personal way to discover fragrance',
  'THE ART OF A LASTING IMPRESSION',
  'Wear the feeling.',
  'Keep the memory.',
  'Fragrance is the quietest way to tell your story. Find a scent that feels like it was always yours.',
  'Discover your scent',
  '01 / THE SIGNATURE COLLECTION',
  'SCENT, MADE PERSONAL'
) on conflict (id) do nothing;

-- 9. DISCOUNT COUPONS TABLE
create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  discount_value integer not null check (discount_value > 0),
  minimum_order_paise integer not null default 0 check (minimum_order_paise >= 0),
  maximum_discount_paise integer check (maximum_discount_paise is null or maximum_discount_paise > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 90),
  check (expires_at is null or expires_at > starts_at)
);

create index if not exists discount_coupons_active_idx on public.discount_coupons (active, starts_at, expires_at);

-- 10. CUSTOMER PROFILES TABLE
create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  gender text not null default 'prefer_not_to_say' check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure admin_note exists if table was created previously
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='customer_profiles' and column_name='admin_note') then
    alter table public.customer_profiles add column admin_note text not null default '';
  end if;
end $$;

-- 11. CUSTOMER ADDRESSES TABLE
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^\d{6}$'),
  country text not null default 'India' check (country = 'India'),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- 12. CUSTOMER WISHLIST TABLE
create table if not exists public.customer_wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- 13. RETURN REQUESTS TABLE
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  reason text not null check (reason in ('damaged', 'wrong_item', 'quality', 'other')),
  details text not null default '',
  status text not null default 'requested' check (status in ('requested', 'under_review', 'approved', 'declined', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, order_id)
);

-- 14. WEBHOOK & RATE LIMIT TABLES
create table if not exists public.webhook_events (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.order_lookup_limits (
  ip_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now()
);

create table if not exists public.order_notification_events (
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('order_confirmation', 'payment_review', 'shipment_update', 'refund_update')),
  sent_at timestamptz,
  primary key (order_id, event_type)
);

-- 15. STORAGE BUCKET FOR PRODUCT IMAGES
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 16. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.seller_fulfillments enable row level security;
alter table public.store_categories enable row level security;
alter table public.storefront_settings enable row level security;
alter table public.discount_coupons enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_wishlist enable row level security;
alter table public.return_requests enable row level security;
alter table public.webhook_events enable row level security;
alter table public.order_lookup_limits enable row level security;
alter table public.order_notification_events enable row level security;

-- Drop and recreate public read policies
drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
  on public.products for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Anyone can view active store categories" on public.store_categories;
create policy "Anyone can view active store categories"
  on public.store_categories for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Anyone can view homepage settings" on public.storefront_settings;
create policy "Anyone can view homepage settings"
  on public.storefront_settings for select
  to anon, authenticated
  using (id = 'home');

drop policy if exists "Product images are publicly viewable" on storage.objects;
create policy "Product images are publicly viewable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- 17. COMPLETE ROLES & POSTGREST PERMISSIONS
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

-- 18. FORCE POSTGREST SCHEMA CACHE RELOAD
notify pgrst, 'reload schema';

