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
    const { data: order, error } = await supabase.from("orders")
      .select("id, order_number, email, status, payment_status, total_paise, created_at, tracking_carrier, tracking_number, tracking_url, order_items(product_name, size, quantity)")
      .eq("order_number", parsed.data.orderNumber).eq("email", parsed.data.email.toLowerCase()).maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ error: "We could not find an order with those details. Please check your confirmation email." }, { status: 404 });
    const { data: shipments, error: shipmentError } = await supabase.from("seller_fulfillments")
      .select("status, tracking_carrier, tracking_number, tracking_url, seller_profiles(store_name)")
      .eq("order_id", order.id);
    if (shipmentError) throw shipmentError;
    return NextResponse.json({ order: {
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      totalPaise: order.total_paise,
      createdAt: order.created_at,
      trackingCarrier: order.tracking_carrier,
      trackingNumber: order.tracking_number,
      trackingUrl: order.tracking_url,
      items: order.order_items,
      shipments: (shipments ?? []).map((shipment) => ({
        status: shipment.status,
        trackingCarrier: shipment.tracking_carrier,
        trackingNumber: shipment.tracking_number,
        trackingUrl: shipment.tracking_url,
        storeName: (shipment.seller_profiles as unknown as { store_name: string } | null)?.store_name ?? "Marketplace seller",
      })),
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order lookup failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Order tracking is temporarily unavailable." }, { status: 503 });
  }
}
