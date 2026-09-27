create table public.discount_coupons (
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

alter table public.discount_coupons enable row level security;
create index discount_coupons_active_idx on public.discount_coupons (active, starts_at, expires_at);
