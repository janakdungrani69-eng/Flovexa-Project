-- Let each Seller own products without changing the Owner catalogue model.
alter table public.products
  add column seller_id uuid references public.seller_profiles(user_id) on delete set null;

create index products_seller_created_idx
  on public.products (seller_id, created_at desc)
  where seller_id is not null;

-- Preserve the Seller who supplied each line even if the product is later edited.
alter table public.order_items
  add column seller_id uuid references public.seller_profiles(user_id) on delete set null;

update public.order_items item
set seller_id = product.seller_id
from public.products product
where item.product_id = product.id
  and product.seller_id is not null;

create index order_items_seller_order_idx
  on public.order_items (seller_id, order_id)
  where seller_id is not null;

create or replace function public.snapshot_order_item_seller()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_id is not null then
    select product.seller_id into new.seller_id
    from public.products product
    where product.id = new.product_id;
  else
    new.seller_id := null;
  end if;
  return new;
end;
$$;

revoke all on function public.snapshot_order_item_seller() from public, anon, authenticated;

create trigger snapshot_order_item_seller_before_write
  before insert or update of product_id on public.order_items
  for each row execute function public.snapshot_order_item_seller();

create table public.seller_fulfillments (
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

create index seller_fulfillments_order_idx on public.seller_fulfillments (order_id);
alter table public.seller_fulfillments enable row level security;
revoke all on table public.seller_fulfillments from public, anon, authenticated;
grant select, insert, update, delete on table public.seller_fulfillments to service_role;

insert into public.seller_fulfillments (seller_id, order_id)
select distinct seller_id, order_id
from public.order_items
where seller_id is not null
on conflict (seller_id, order_id) do nothing;

create or replace function public.create_seller_fulfillment_for_order_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.seller_id is not null then
    insert into public.seller_fulfillments (seller_id, order_id)
    values (new.seller_id, new.order_id)
    on conflict (seller_id, order_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.create_seller_fulfillment_for_order_item() from public, anon, authenticated;

create trigger create_seller_fulfillment_after_order_item
  after insert or update of seller_id, order_id on public.order_items
  for each row execute function public.create_seller_fulfillment_for_order_item();
