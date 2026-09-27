create table if not exists public.seller_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_name text not null default '',
  status text not null default 'active' check (status in ('active', 'suspended')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_profiles enable row level security;

insert into public.seller_profiles (user_id, store_name)
select id, coalesce(nullif(raw_user_meta_data->>'store_name', ''), split_part(email, '@', 1), 'Seller')
from auth.users
where raw_app_meta_data->>'role' = 'seller'
on conflict (user_id) do nothing;

comment on table public.seller_profiles is 'Owner-managed records for accounts already granted the seller role. Access changes are performed by the service-role admin API.';
