create or replace function public.admin_delete_product_if_unused(product_uuid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Serialize deletion with checkout's product row lock and stock reservation.
  perform 1 from public.products where id = product_uuid for update;
  if not found then
    return 'not_found';
  end if;

  -- Keep products that appear in order history so past orders remain intact.
  if exists (
    select 1 from public.order_items where product_id = product_uuid
  ) then
    return 'has_orders';
  end if;

  delete from public.products where id = product_uuid;
  return 'deleted';
end;
$$;

revoke all on function public.admin_delete_product_if_unused(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_delete_product_if_unused(uuid)
  to service_role;
