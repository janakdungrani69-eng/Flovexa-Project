import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSeller } from "@/lib/supabase/seller-user";

const updateSchema = z.object({
  status: z.enum(["processing", "shipped", "delivered"]),
  trackingCarrier: z.string().trim().max(80),
  trackingNumber: z.string().trim().max(120),
  trackingUrl: z.string().trim().refine((value) => value === "" || (URL.canParse(value) && new URL(value).protocol === "https:")).max(2048),
}).strict();

const nextStates: Record<string, string[]> = {
  paid: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });
    const [{ id }, body] = await Promise.all([params, request.json().catch(() => null)]);
    if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Please check the shipment details." }, { status: 400 });

    const [{ data: ownItem, error: itemError }, { data: order, error: orderError }, { data: current, error: currentError }] = await Promise.all([
      seller.supabase.from("order_items").select("id").eq("seller_id", seller.user.id).eq("order_id", id).limit(1).maybeSingle(),
      seller.supabase.from("orders").select("id, payment_status, status").eq("id", id).maybeSingle(),
      seller.supabase.from("seller_fulfillments").select("status").eq("seller_id", seller.user.id).eq("order_id", id).maybeSingle(),
    ]);
    if (itemError || orderError || currentError) throw itemError ?? orderError ?? currentError;
    if (!ownItem || !order) return NextResponse.json({ error: "This order is not assigned to your store." }, { status: 404 });
    if (order.payment_status !== "captured" || ["cancelled", "refunded"].includes(order.status)) {
      return NextResponse.json({ error: "Only paid orders can be processed." }, { status: 409 });
    }

    const currentStatus = current?.status ?? "paid";
    const unchanged = currentStatus === parsed.data.status;
    if (!unchanged && !nextStates[currentStatus]?.includes(parsed.data.status)) {
      return NextResponse.json({ error: "That fulfillment status change is not allowed." }, { status: 409 });
    }
    if (parsed.data.status === "shipped" && (!parsed.data.trackingCarrier || !parsed.data.trackingNumber || !parsed.data.trackingUrl)) {
      return NextResponse.json({ error: "Add the courier, tracking number and secure tracking link before shipping." }, { status: 400 });
    }

    const { data, error } = await seller.supabase.from("seller_fulfillments").upsert({
      seller_id: seller.user.id,
      order_id: id,
      status: parsed.data.status,
      tracking_carrier: parsed.data.trackingCarrier || null,
      tracking_number: parsed.data.trackingNumber || null,
      tracking_url: parsed.data.trackingUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "seller_id,order_id" }).select("order_id, status, tracking_carrier, tracking_number, tracking_url").single();
    if (error) throw error;
    return NextResponse.json({ fulfillment: data });
  } catch (error) {
    console.error("Seller fulfillment update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not update this shipment." }, { status: 503 });
  }
}
