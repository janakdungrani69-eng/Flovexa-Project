import { NextResponse } from "next/server";
import { getActiveSeller } from "@/lib/supabase/seller-user";
import { getStoreRole } from "@/lib/supabase/roles";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { syncPendingRazorpayOrders } from "@/lib/sync-orders";
import { syncAllShippedOrders } from "@/lib/courier-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });

    const adminDb = createAdminSupabase();

    // 1. Permanently purge test order FLX-261024-277F15EE if present
    try {
      const { data: testOrders } = await adminDb
        .from("orders")
        .select("id")
        .or("order_number.eq.FLX-261024-277F15EE,id.eq.abadb627-06cb-474b-bef7-6a746d1309ce");

      if (testOrders && testOrders.length > 0) {
        for (const tOrd of testOrders) {
          await Promise.all([
            adminDb.from("order_items").delete().eq("order_id", tOrd.id),
            adminDb.from("seller_fulfillments").delete().eq("order_id", tOrd.id),
            adminDb.from("return_requests").delete().eq("order_id", tOrd.id),
          ]);
          await adminDb.from("orders").delete().eq("id", tOrd.id);
        }
      }
    } catch (purgeErr) {
      console.warn("Test order auto-purge check handled:", purgeErr);
    }

    // 2. Reconcile and auto-confirm any orders paid via UPI / Razorpay, and auto-update delivered shipments
    try {
      await Promise.all([
        syncPendingRazorpayOrders(),
        syncAllShippedOrders(),
      ]);
    } catch (syncErr) {
      console.warn("Background order sync handled in seller orders:", syncErr);
    }

    // 3. Query confirmed store orders directly
    const { data: dbOrders, error: orderErr } = await adminDb
      .from("orders")
      .select(`
        id,
        order_number,
        customer_name,
        phone,
        shipping_address,
        status,
        payment_status,
        total_paise,
        created_at,
        tracking_carrier,
        tracking_number,
        tracking_url
      `)
      .neq("status", "pending_payment")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(300);

    if (orderErr) {
      console.error("[seller/orders] Error fetching orders:", orderErr);
      return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });
    }

    const orderList = (dbOrders || []).filter((order) => {
      // Exclude test order if any instance remains
      if (order.order_number === "FLX-261024-277F15EE" || order.id === "abadb627-06cb-474b-bef7-6a746d1309ce") {
        return false;
      }
      const isPaid =
        order.payment_status === "captured" ||
        ["paid", "processing", "shipped", "delivered"].includes(order.status);
      return isPaid && !["cancelled", "refunded"].includes(order.status);
    });

    if (!orderList.length) {
      return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });
    }

    const orderIds = orderList.map((o) => o.id);

    // 4. Fetch order items, fulfillments, and returns in parallel
    const [itemsResult, fulfillmentResult, returnResult] = await Promise.all([
      adminDb
        .from("order_items")
        .select("id, order_id, product_name, size, unit_price_paise, quantity, line_total_paise, seller_id")
        .in("order_id", orderIds),
      adminDb
        .from("seller_fulfillments")
        .select("order_id, status, tracking_carrier, tracking_number, tracking_url, seller_id")
        .in("order_id", orderIds),
      adminDb
        .from("return_requests")
        .select("id, order_id, reason, details, status, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false }),
    ]);

    const itemsByOrder = new Map<string, any[]>();
    for (const item of itemsResult.data || []) {
      const list = itemsByOrder.get(item.order_id) || [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }

    const fulfillmentMap = new Map((fulfillmentResult.data || []).map((f) => [f.order_id, f]));
    const orderMap = new Map(orderList.map((o) => [o.id, o]));

    // 5. Map orders into SellerOrder format (all confirmed customer perfume orders)
    const orders = orderList.flatMap((order) => {
      const items = itemsByOrder.get(order.id) || [];

      const orderItems = items.length > 0 ? items.map((it) => ({
        product_name: it.product_name || "Flovexa Luxury Perfume",
        size: it.size || "50 ml",
        unit_price_paise: it.unit_price_paise || order.total_paise || 39900,
        quantity: it.quantity || 1,
        line_total_paise: it.line_total_paise || order.total_paise || 39900,
      })) : [{
        product_name: "Flovexa Luxury Perfume",
        size: "50 ml",
        unit_price_paise: order.total_paise || 39900,
        quantity: 1,
        line_total_paise: order.total_paise || 39900,
      }];

      const fulfillmentData = fulfillmentMap.get(order.id);

      return [{
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name || "Valued Customer",
        phone: order.phone || "",
        shipping_address: order.shipping_address || {},
        status: order.status || "paid",
        created_at: order.created_at,
        order_items: orderItems,
        fulfillment: {
          status: fulfillmentData?.status || order.status || "paid",
          tracking_carrier: fulfillmentData?.tracking_carrier || order.tracking_carrier || "Mahavir Express",
          tracking_number: fulfillmentData?.tracking_number || order.tracking_number || null,
          tracking_url: fulfillmentData?.tracking_url || order.tracking_url || (order.tracking_number ? "https://shreemahavircourier.com/" : null),
        },
      }];
    });

    const returns = (returnResult.data || []).flatMap((request) => {
      const order = orderMap.get(request.order_id);
      if (!order) return [];
      return [{
        ...request,
        order_number: order.order_number,
        customer_name: order.customer_name,
      }];
    });

    const grossSalesPaise = orders.reduce(
      (sum, order) => sum + (order.order_items || []).reduce((sub, it) => sub + (it.line_total_paise || 0), 0),
      0
    );

    return NextResponse.json({ orders, returns, grossSalesPaise });
  } catch (error) {
    console.error("Seller orders could not be loaded", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });
  }
}
