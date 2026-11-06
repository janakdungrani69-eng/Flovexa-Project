import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const lookupSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(/^FLX-\d{6}-[A-F0-9]{12}$/),
  email: z.email().trim().max(254),
}).strict();

export async function POST(request: Request) {
  const parsed = lookupSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter the order number and email from your confirmation." }, { status: 400 });
  const pepper = process.env.ORDER_LOOKUP_PEPPER;
  if (!pepper) return NextResponse.json({ error: "Order tracking is being configured. Please try again soon." }, { status: 503 });
  try {
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const ipHash = createHmac("sha256", pepper).update(ip).digest("hex");
    const supabase = createAdminSupabase();
    const { data: allowed, error: rateError } = await supabase.rpc("consume_order_lookup", { ip_key: ipHash });
    if (rateError) throw rateError;
    if (!allowed) return NextResponse.json({ error: "Too many lookups. Please wait 15 minutes and try again." }, { status: 429 });
    let { data: order, error } = await supabase.from("orders")
      .select("id, order_number, email, status, payment_status, razorpay_order_id, total_paise, shipping_address, created_at, tracking_carrier, tracking_number, tracking_url, order_items(product_name, size, quantity)")
      .eq("order_number", parsed.data.orderNumber).eq("email", parsed.data.email.toLowerCase()).maybeSingle();
    if (error) throw error;

    // If order is still pending_payment, check Razorpay directly before rejecting
    if (order && (order.status === "pending_payment" || order.payment_status === "created") && order.razorpay_order_id) {
      try {
        const { createRazorpay } = await import("@/lib/razorpay");
        const { client } = createRazorpay();
        const rzpOrder: any = await client.orders.fetch(order.razorpay_order_id);
        if (rzpOrder && (rzpOrder.status === "paid" || (rzpOrder.amount_paid && rzpOrder.amount_paid > 0))) {
          const paymentsRes: any = await (client.orders as any).payments(order.razorpay_order_id);
          const payments = paymentsRes?.items || [];
          const captured = payments.find((p: any) => p.status === "captured") || payments[0];
          const paymentId = captured?.id || `pay_sync_${order.razorpay_order_id}`;

          await supabase.from("orders").update({
            status: "paid",
            payment_status: "captured",
            razorpay_payment_id: paymentId,
            tracking_carrier: "Mahavir Express",
            updated_at: new Date().toISOString(),
          }).eq("id", order.id);

          order = {
            ...order,
            status: "paid",
            payment_status: "captured",
          };
        }
      } catch (checkErr) {
        console.warn("Direct Razorpay check in lookup handled:", checkErr);
      }
    }

    if (!order || order.status === "pending_payment" || order.payment_status === "created") {
      return NextResponse.json({ error: "We could not find a confirmed order with those details. Please check your confirmation email." }, { status: 404 });
    }
    const { data: shipments, error: shipmentError } = await supabase.from("seller_fulfillments")
      .select("status, tracking_carrier, tracking_number, tracking_url, seller_profiles(store_name)")
      .eq("order_id", order.id);
    if (shipmentError) throw shipmentError;
    return NextResponse.json({ order: {
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      totalPaise: order.total_paise,
      discountPaise: (order.shipping_address as any)?.discount_paise ?? 0,
      couponCode: (order.shipping_address as any)?.coupon_code ?? null,
      createdAt: order.created_at,
      trackingCarrier: order.tracking_carrier || (order.tracking_number ? "Mahavir Express" : null),
      trackingNumber: order.tracking_number,
      trackingUrl: order.tracking_url || (order.tracking_number ? "https://shreemahavircourier.com/" : null),
      items: order.order_items,
      shipments: (shipments ?? []).map((shipment) => ({
        status: shipment.status,
        trackingCarrier: shipment.tracking_carrier || (shipment.tracking_number ? "Mahavir Express" : null),
        trackingNumber: shipment.tracking_number,
        trackingUrl: shipment.tracking_url || (shipment.tracking_number ? "https://shreemahavircourier.com/" : null),
        storeName: (shipment.seller_profiles as unknown as { store_name: string } | null)?.store_name ?? "Marketplace seller",
      })),
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order lookup failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Order tracking is temporarily unavailable." }, { status: 503 });
  }
}
