alter table public.products drop constraint if exists products_category_check;

create table public.store_categories (
  name text primary key check (char_length(name) between 2 and 60),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.store_categories (name, sort_order) values
  ('For Her', 10), ('For Him', 20), ('Unisex', 30), ('Oud & Attar', 40), ('Discovery Sets', 50)
on conflict (name) do nothing;

create table public.storefront_settings (
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
values ('home', 'A more personal way to discover fragrance', 'THE ART OF A LASTING IMPRESSION', 'Wear the feeling.', 'Keep the memory.', 'Fragrance is the quietest way to tell your story. Find a scent that feels like it was always yours.', 'Discover your scent', '01 / THE SIGNATURE COLLECTION', 'SCENT, MADE PERSONAL')
on conflict (id) do nothing;

alter table public.store_categories enable row level security;
alter table public.storefront_settings enable row level security;
create policy "Anyone can view active store categories" on public.store_categories for select to anon, authenticated using (active = true);
create policy "Anyone can view homepage settings" on public.storefront_settings for select to anon, authenticated using (id = 'home');
