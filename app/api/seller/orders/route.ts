import { NextResponse } from "next/server";
import { getActiveSeller } from "@/lib/supabase/seller-user";

export async function GET() {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });

    const { data: items, error: itemError } = await seller.supabase
      .from("order_items")
      .select("id, order_id, product_name, size, unit_price_paise, quantity, line_total_paise")
      .eq("seller_id", seller.user.id)
      .order("order_id", { ascending: false })
      .limit(500);
    if (itemError) throw itemError;
    const orderIds = [...new Set((items ?? []).map((item) => item.order_id))];
    if (!orderIds.length) return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });

    const [orderResult, fulfillmentResult, returnResult] = await Promise.all([
      seller.supabase.from("orders").select("id, order_number, customer_name, phone, shipping_address, status, payment_status, created_at").in("id", orderIds),
      seller.supabase.from("seller_fulfillments").select("order_id, status, tracking_carrier, tracking_number, tracking_url").eq("seller_id", seller.user.id).in("order_id", orderIds),
      seller.supabase.from("return_requests").select("id, order_id, reason, details, status, created_at").in("order_id", orderIds).order("created_at", { ascending: false }),
    ]);
    if (orderResult.error || fulfillmentResult.error || returnResult.error) throw orderResult.error ?? fulfillmentResult.error ?? returnResult.error;

    const orderMap = new Map((orderResult.data ?? []).map((order) => [order.id, order]));
    const fulfillmentMap = new Map((fulfillmentResult.data ?? []).map((fulfillment) => [fulfillment.order_id, fulfillment]));
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items ?? []) {
      const current = itemsByOrder.get(item.order_id) ?? [];
      current.push(item);
      itemsByOrder.set(item.order_id, current);
    }

    const orders = [...itemsByOrder.entries()].flatMap(([orderId, orderItems]) => {
      const order = orderMap.get(orderId);
      if (!order || order.payment_status !== "captured" || ["cancelled", "refunded"].includes(order.status)) return [];
      return [{ ...order, order_items: orderItems, fulfillment: fulfillmentMap.get(orderId) ?? { status: "paid", tracking_carrier: null, tracking_number: null, tracking_url: null } }];
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));

    const returns = (returnResult.data ?? []).flatMap((request) => {
      const order = orderMap.get(request.order_id);
      if (!order) return [];
      return [{ ...request, order_number: order.order_number, customer_name: order.customer_name }];
    });
    const grossSalesPaise = orders.reduce((sum, order) => sum + order.order_items.reduce((subtotal, item) => subtotal + item.line_total_paise, 0), 0);
    return NextResponse.json({ orders, returns, grossSalesPaise });
  } catch (error) {
    console.error("Seller orders could not be loaded", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not load your orders." }, { status: 503 });
  }
}
