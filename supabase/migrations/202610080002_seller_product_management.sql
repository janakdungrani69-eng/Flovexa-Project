create function public.seller_delete_product_if_unused(product_uuid uuid, seller_uuid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  product_seller uuid;
begin
  select seller_id into product_seller
    from public.products
    where id = product_uuid
    for update;
  if not found then
    return 'not_found';
  end if;
  if product_seller is distinct from seller_uuid then
    return 'forbidden';
  end if;
  if exists (select 1 from public.order_items where product_id = product_uuid) then
    return 'has_orders';
  end if;

  delete from public.products where id = product_uuid and seller_id = seller_uuid;
  return 'deleted';
end;
$$;

revoke all on function public.seller_delete_product_if_unused(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.seller_delete_product_if_unused(uuid, uuid)
  to service_role;