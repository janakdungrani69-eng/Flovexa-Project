import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

const updateSchema = z.object({
  status: z.enum(["paid", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  trackingCarrier: z.string().trim().max(80),
  trackingNumber: z.string().trim().max(120),
  trackingUrl: z.string().trim().refine((value) => value === "" || (URL.canParse(value) && new URL(value).protocol === "https:")).max(2048),
}).strict();

const nextStates: Record<string, string[]> = {
  pending_payment: ["cancelled"], paid: ["processing"], processing: ["shipped"],
  shipped: ["delivered"], delivered: [], cancelled: [], refunded: [], payment_review: [],
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const [{ id }, body] = await Promise.all([params, request.json()]);
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the status and shipment details." }, { status: 400 });
  try {
    const supabase = createAdminSupabase();
    const { data: current, error: loadError } = await supabase.from("orders").select("id, status, payment_status").eq("id", id).maybeSingle();
    if (loadError || !current) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const allowed = nextStates[current.status] ?? [];
    const unchanged = parsed.data.status === current.status;
    if (!unchanged && !allowed.includes(parsed.data.status)) return NextResponse.json({ error: "That order status change is not allowed." }, { status: 409 });
    if (["paid", "processing", "shipped", "delivered"].includes(parsed.data.status) && current.payment_status !== "captured") {
      return NextResponse.json({ error: "A confirmed payment is required before fulfillment." }, { status: 409 });
    }
    if (parsed.data.status === "shipped" && (!parsed.data.trackingCarrier || !parsed.data.trackingNumber || !parsed.data.trackingUrl)) {
      return NextResponse.json({ error: "Add the carrier and tracking details before marking an order shipped." }, { status: 400 });
    }
    if (parsed.data.status === "cancelled") {
      if (current.payment_status === "captured") return NextResponse.json({ error: "Refund captured payments before cancelling a paid order." }, { status: 409 });
      const { data: cancelled, error } = await supabase.rpc("cancel_pending_order", { order_uuid: id });
      if (error) throw error;
      if (!cancelled) return NextResponse.json({ error: "This order can no longer be cancelled." }, { status: 409 });
    }
    const update: Record<string, unknown> = {
      tracking_carrier: parsed.data.trackingCarrier || null,
      tracking_number: parsed.data.trackingNumber || null,
      tracking_url: parsed.data.trackingUrl || null,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.status !== "cancelled") update.status = parsed.data.status;
    const { data: order, error } = await supabase.from("orders").update(update).eq("id", id).select("id, order_number, customer_name, email, phone, shipping_address, total_paise, status, payment_status, tracking_carrier, tracking_number, tracking_url, created_at, order_items(product_name, size, quantity)").single();
    if (error) throw error;
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Order update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not update this order." }, { status: 500 });
  }
}
