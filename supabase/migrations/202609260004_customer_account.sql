create table public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
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

create table public.customer_wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.return_requests (
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

insert into public.customer_profiles (user_id, full_name)
select id, coalesce(raw_user_meta_data->>'full_name', '') from auth.users
on conflict (user_id) do nothing;

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_customer_profile
  after insert on auth.users
  for each row execute function public.create_customer_profile();

alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_wishlist enable row level security;
alter table public.return_requests enable row level security;

create policy "Customers can read their profile"
  on public.customer_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Customers can update their profile"
  on public.customer_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Customers manage their delivery addresses"
  on public.customer_addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Customers manage their perfume wishlist"
  on public.customer_wishlist for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Customers can read their return requests"
  on public.return_requests for select to authenticated
  using (user_id = (select auth.uid()));

create index customer_addresses_user_idx on public.customer_addresses (user_id, is_default desc, created_at desc);
create index return_requests_status_idx on public.return_requests (status, created_at desc);
