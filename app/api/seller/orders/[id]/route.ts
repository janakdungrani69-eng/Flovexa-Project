import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSeller } from "@/lib/supabase/seller-user";
import { getStoreRole } from "@/lib/supabase/roles";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendOrderEmail } from "@/lib/order-email";

const updateSchema = z.object({
  status: z.enum(["processing", "shipped", "delivered"]),
  trackingCarrier: z.string().trim().max(80).optional().default("Mahavir Express"),
  trackingNumber: z.string().trim().max(120).optional().default(""),
  trackingUrl: z.string().trim().optional().default(""),
}).strict();

const nextStates: Record<string, string[]> = {
  paid: ["processing", "shipped"],
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

    const role = getStoreRole(seller.user);
    const isMasterAdmin =
      role === "admin" ||
      seller.user.email?.trim().toLowerCase() === "janakdungrani69@gmail.com";

    const ownItemPromise = isMasterAdmin
      ? Promise.resolve({ data: { id }, error: null })
      : seller.supabase.from("order_items").select("id").eq("seller_id", seller.user.id).eq("order_id", id).limit(1).maybeSingle();

    const currentFulfillmentPromise = isMasterAdmin
      ? seller.supabase.from("seller_fulfillments").select("status").eq("order_id", id).maybeSingle()
      : seller.supabase.from("seller_fulfillments").select("status").eq("seller_id", seller.user.id).eq("order_id", id).maybeSingle();

    const [{ data: ownItem, error: itemError }, { data: order, error: orderError }, { data: current, error: currentError }] = await Promise.all([
      ownItemPromise,
      seller.supabase.from("orders").select("id, payment_status, status").eq("id", id).maybeSingle(),
      currentFulfillmentPromise,
    ]);
    if (itemError || orderError || currentError) throw itemError ?? orderError ?? currentError;
    if (!ownItem || !order) return NextResponse.json({ error: "This order is not assigned to your store." }, { status: 404 });
    if (order.payment_status !== "captured" || ["cancelled", "refunded"].includes(order.status)) {
      return NextResponse.json({ error: "Only paid orders can be processed." }, { status: 409 });
    }

    const currentStatus = current?.status ?? order.status ?? "paid";
    const unchanged = currentStatus === parsed.data.status;
    if (!unchanged && !nextStates[currentStatus]?.includes(parsed.data.status)) {
      return NextResponse.json({ error: "That fulfillment status change is not allowed." }, { status: 409 });
    }
    if (parsed.data.status === "shipped" && !parsed.data.trackingNumber) {
      return NextResponse.json({ error: "Please enter the Consignment / Tracking ID before marking order shipped." }, { status: 400 });
    }

    const carrier = parsed.data.trackingCarrier || "Mahavir Express";
    const trackingNum = parsed.data.trackingNumber || null;
    const trackingUrl = parsed.data.trackingUrl || (trackingNum ? "https://shreemahavircourier.com/" : null);

    const { data, error } = await seller.supabase.from("seller_fulfillments").upsert({
      seller_id: seller.user.id,
      order_id: id,
      status: parsed.data.status,
      tracking_carrier: carrier,
      tracking_number: trackingNum,
      tracking_url: trackingUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: "seller_id,order_id" }).select("order_id, status, tracking_carrier, tracking_number, tracking_url").single();
    if (error) throw error;

    // Immediately sync to customer-facing public.orders table so customer sees live tracking!
    const adminDb = createAdminSupabase();
    await adminDb.from("orders").update({
      status: parsed.data.status,
      tracking_carrier: carrier,
      tracking_number: trackingNum,
      tracking_url: trackingUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    // If order was marked shipped or delivered, notify customer
    if (parsed.data.status === "shipped") {
      try {
        await sendOrderEmail(id, "shipment_update");
      } catch (emailErr) {
        console.error("Shipment update email deferred:", emailErr);
      }
    } else if (parsed.data.status === "delivered") {
      try {
        await sendOrderEmail(id, "delivered");
      } catch (emailErr) {
        console.error("Delivered email deferred:", emailErr);
      }
    }

    return NextResponse.json({ fulfillment: data });
  } catch (error) {
    console.error("Seller fulfillment update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not update this shipment." }, { status: 503 });
  }
}
