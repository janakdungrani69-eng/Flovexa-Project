alter table public.customer_profiles
  add column if not exists admin_note text not null default '' check (char_length(admin_note) <= 1000);
