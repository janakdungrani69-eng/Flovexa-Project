alter table public.orders
  add column coupon_id uuid references public.discount_coupons(id) on delete set null,
  add column coupon_code text,
  add column discount_paise integer not null default 0 check (discount_paise >= 0);

create or replace function public.release_order_coupon_redemption()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending_payment' and new.status = 'cancelled' and old.coupon_id is not null then
    update public.discount_coupons
      set usage_count = greatest(usage_count - 1, 0)
      where id = old.coupon_id;
  end if;
  return new;
end;
$$;

revoke all on function public.release_order_coupon_redemption() from public, anon, authenticated;

create trigger release_order_coupon_redemption_after_cancel
  after update of status on public.orders
  for each row execute function public.release_order_coupon_redemption();

drop function public.create_pending_order(jsonb, jsonb, integer, integer, integer, text);

create function public.create_pending_order(
  customer jsonb,
  cart jsonb,
  shipping_rate integer,
  free_shipping_threshold integer,
  tax_rate_bps integer,
  pricing_tax_mode text,
  requested_coupon_code text
)
returns table (
  created_order_id uuid,
  created_order_number text,
  created_subtotal_paise integer,
  created_shipping_paise integer,
  created_tax_paise integer,
  created_total_paise integer,
  created_coupon_code text,
  created_discount_paise integer,
  reserved_items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested record;
  product_row public.products%rowtype;
  coupon_row public.discount_coupons%rowtype;
  new_id uuid := gen_random_uuid();
  new_number text := 'FLX-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || upper(encode(gen_random_bytes(6), 'hex'));
  subtotal integer := 0;
  discount_amount integer := 0;
  discounted_subtotal integer := 0;
  shipping_amount integer := 0;
  tax_amount integer := 0;
  total integer := 0;
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

  if requested_coupon_code is not null and trim(requested_coupon_code) <> '' then
    select * into coupon_row from public.discount_coupons
      where code = upper(trim(requested_coupon_code))
      for update;
    if not found or not coupon_row.active or coupon_row.starts_at > now()
      or (coupon_row.expires_at is not null and coupon_row.expires_at <= now())
      or (coupon_row.usage_limit is not null and coupon_row.usage_count >= coupon_row.usage_limit) then
      raise exception 'Coupon is invalid or unavailable';
    end if;
    if subtotal < coupon_row.minimum_order_paise then raise exception 'Coupon minimum order is not met'; end if;
    if coupon_row.discount_type = 'percentage' then
      discount_amount := round(subtotal::numeric * coupon_row.discount_value / 100)::integer;
    else
      discount_amount := coupon_row.discount_value;
    end if;
    if coupon_row.maximum_discount_paise is not null then
      discount_amount := least(discount_amount, coupon_row.maximum_discount_paise);
    end if;
    discount_amount := least(discount_amount, subtotal);
    if discount_amount <= 0 then raise exception 'Coupon discount is invalid'; end if;
    update public.discount_coupons set usage_count = usage_count + 1 where id = coupon_row.id;
  end if;

  discounted_subtotal := subtotal - discount_amount;
  shipping_amount := case when free_shipping_threshold is not null and subtotal >= free_shipping_threshold then 0 else shipping_rate end;
  is_tax_included := pricing_tax_mode = 'inclusive';
  tax_amount := case
    when pricing_tax_mode = 'none' then 0
    when pricing_tax_mode = 'inclusive' then round(discounted_subtotal::numeric * tax_rate_bps / (10000 + tax_rate_bps))::integer
    else round(discounted_subtotal::numeric * tax_rate_bps / 10000)::integer
  end;
  total := discounted_subtotal + shipping_amount + case when is_tax_included then 0 else tax_amount end;
  if subtotal <= 0 or total <= 0 or total > 200000000 then raise exception 'Invalid order total'; end if;

  insert into public.orders (
    id, order_number, customer_name, email, phone, shipping_address,
    subtotal_paise, shipping_paise, tax_paise, tax_included, total_paise,
    coupon_id, coupon_code, discount_paise, inventory_reserved_until
  ) values (
    new_id, new_number, trim(customer->>'name'), lower(trim(customer->>'email')),
    trim(customer->>'phone'), customer->'address', subtotal, shipping_amount, tax_amount, is_tax_included, total,
    coupon_row.id, coupon_row.code, discount_amount, now() + interval '20 minutes'
  );

  insert into public.order_items (order_id, product_id, product_name, product_slug, size, unit_price_paise, quantity, line_total_paise)
  select new_id, item.product_id, item.product_name, item.product_slug, item.size,
    item.unit_price_paise, item.quantity, item.line_total_paise
  from jsonb_to_recordset(lines) as item (
    product_id uuid, product_name text, product_slug text, size text,
    unit_price_paise integer, quantity integer, line_total_paise integer
  );

  return query select new_id, new_number, subtotal, shipping_amount, tax_amount, total,
    coupon_row.code, discount_amount, lines;
end;
$$;

revoke all on function public.create_pending_order(jsonb, jsonb, integer, integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.create_pending_order(jsonb, jsonb, integer, integer, integer, text, text) to service_role;