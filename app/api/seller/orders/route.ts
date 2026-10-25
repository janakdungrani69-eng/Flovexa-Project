import { NextResponse } from "next/server";
import { getActiveSeller } from "@/lib/supabase/seller-user";
import { getStoreRole } from "@/lib/supabase/roles";

export async function GET() {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });

    const role = getStoreRole(seller.user);
    const isMasterAdmin =
      role === "admin" ||
      seller.user.email?.trim().toLowerCase() === "janakdungrani69@gmail.com";

    let items: Array<{ id: string; order_id: string; product_name: string; size: string; unit_price_paise: number; quantity: number; line_total_paise: number }> = [];
    try {
      const itemsQuery = isMasterAdmin
        ? seller.supabase
            .from("order_items")
            .select("id, order_id, product_name, size, unit_price_paise, quantity, line_total_paise")
            .order("order_id", { ascending: false })
            .limit(500)
        : seller.supabase
            .from("order_items")
            .select("id, order_id, product_name, size, unit_price_paise, quantity, line_total_paise")
            .eq("seller_id", seller.user.id)
            .order("order_id", { ascending: false })
            .limit(500);

      const { data: itemRows, error: itemError } = await itemsQuery;

      if (itemError) {
        console.error("[seller/orders] Notice: Could not read order_items:", itemError);
      } else if (itemRows) {
        items = itemRows;
      }
    } catch (e) {
      console.error("[seller/orders] Handled order_items error:", e);
    }

    const orderIds = [...new Set(items.map((item) => item.order_id))];
    if (!orderIds.length) {
      return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });
    }

    try {
      const fulfillmentQuery = isMasterAdmin
        ? seller.supabase
            .from("seller_fulfillments")
            .select("order_id, status, tracking_carrier, tracking_number, tracking_url")
            .in("order_id", orderIds)
        : seller.supabase
            .from("seller_fulfillments")
            .select("order_id, status, tracking_carrier, tracking_number, tracking_url")
            .eq("seller_id", seller.user.id)
            .in("order_id", orderIds);

      const [orderResult, fulfillmentResult, returnResult] = await Promise.all([
        seller.supabase.from("orders").select("id, order_number, customer_name, phone, shipping_address, status, payment_status, created_at, tracking_carrier, tracking_number, tracking_url").in("id", orderIds),
        fulfillmentQuery,
        seller.supabase.from("return_requests").select("id, order_id, reason, details, status, created_at").in("order_id", orderIds).order("created_at", { ascending: false }),
      ]);

      const orderMap = new Map((orderResult.data ?? []).map((order) => [order.id, order]));
      const fulfillmentMap = new Map((fulfillmentResult.data ?? []).map((fulfillment) => [fulfillment.order_id, fulfillment]));
      const itemsByOrder = new Map<string, typeof items>();
      for (const item of items) {
        const current = itemsByOrder.get(item.order_id) ?? [];
        current.push(item);
        itemsByOrder.set(item.order_id, current);
      }

      const orders = [...itemsByOrder.entries()].flatMap(([orderId, orderItems]) => {
        const order = orderMap.get(orderId);
        if (!order || order.payment_status !== "captured" || ["cancelled", "refunded"].includes(order.status)) return [];
        return [{
          ...order,
          order_items: orderItems,
          fulfillment: fulfillmentMap.get(orderId) ?? {
            status: order.status || "paid",
            tracking_carrier: order.tracking_carrier || "Flovexa Priority Express",
            tracking_number: order.tracking_number || null,
            tracking_url: order.tracking_url || null,
          },
        }];
      }).sort((a, b) => b.created_at.localeCompare(a.created_at));

      const returns = (returnResult.data ?? []).flatMap((request) => {
        const order = orderMap.get(request.order_id);
        if (!order) return [];
        return [{ ...request, order_number: order.order_number, customer_name: order.customer_name }];
      });
      const grossSalesPaise = orders.reduce((sum, order) => sum + order.order_items.reduce((subtotal, item) => subtotal + item.line_total_paise, 0), 0);
      return NextResponse.json({ orders, returns, grossSalesPaise });
    } catch (dbErr) {
      console.error("[seller/orders] Error fetching order details:", dbErr);
      return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });
    }
  } catch (error) {
    console.error("Seller orders could not be loaded", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });
  }
}
