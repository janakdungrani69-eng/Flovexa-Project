alter table public.customer_profiles
  add column if not exists gender text not null default 'prefer_not_to_say'
  check (gender in ('male', 'female', 'other', 'prefer_not_to_say'));

update public.customer_profiles
set gender = 'prefer_not_to_say'
where gender is null or gender not in ('male', 'female', 'other', 'prefer_not_to_say');

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_profiles (user_id, full_name, gender)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'gender', 'prefer_not_to_say')
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    gender = excluded.gender,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer_profile on auth.users;

create trigger on_auth_user_created_customer_profile
  after insert on auth.users
  for each row execute function public.create_customer_profile();
