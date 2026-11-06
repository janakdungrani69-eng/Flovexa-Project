import { NextResponse } from "next/server";
import { getActiveSeller } from "@/lib/supabase/seller-user";
import { getStoreRole } from "@/lib/supabase/roles";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { syncPendingRazorpayOrders } from "@/lib/sync-orders";
import { syncAllShippedOrders } from "@/lib/courier-tracking";

export async function GET() {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });

    // 1. Reconcile and auto-confirm any orders paid via UPI / Razorpay, and auto-update delivered shipments
    try {
      await Promise.all([
        syncPendingRazorpayOrders(),
        syncAllShippedOrders(),
      ]);
    } catch (syncErr) {
      console.warn("Background order sync handled in seller orders:", syncErr);
    }

    const role = getStoreRole(seller.user);
    const email = seller.user.email?.trim().toLowerCase() || "";
    const isMasterMerchant =
      role === "admin" ||
      email === "janakdungrani69@gmail.com" ||
      email === "flovexaenterprises@gmail.com" ||
      email === "businessflovax@gmail.com";

    const adminDb = createAdminSupabase();

    // 2. Query confirmed store orders directly
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
      .not("status", "in", '("pending_payment","cancelled")')
      .order("created_at", { ascending: false })
      .limit(300);

    if (orderErr) {
      console.error("[seller/orders] Error fetching orders:", orderErr);
      return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });
    }

    const orderList = (dbOrders || []).filter((order) => {
      const isPaid =
        order.payment_status === "captured" ||
        ["paid", "processing", "shipped", "delivered"].includes(order.status);
      return isPaid && !["cancelled", "refunded"].includes(order.status);
    });

    if (!orderList.length) {
      return NextResponse.json({ orders: [], returns: [], grossSalesPaise: 0 });
    }

    const orderIds = orderList.map((o) => o.id);

    // 3. Fetch order items, fulfillments, and returns in parallel
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

    // 4. Map orders into SellerOrder format
    const orders = orderList.flatMap((order) => {
      const items = itemsByOrder.get(order.id) || [];

      // If third-party seller with restricted access, check if any item belongs to them
      if (!isMasterMerchant && items.length > 0) {
        const hasOwnItem = items.some((item) => item.seller_id === seller.user.id || !item.seller_id);
        if (!hasOwnItem) return [];
      }

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
