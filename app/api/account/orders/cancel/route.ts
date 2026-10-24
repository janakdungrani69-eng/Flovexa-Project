import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerUser } from "@/lib/supabase/customer-user";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const cancelSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(300).optional().default("Customer requested cancellation within 24h window"),
});

export async function POST(request: Request) {
  try {
    const user = await getCustomerUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "Please sign in to cancel your order." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid cancellation request parameters." }, { status: 400 });
    }

    const { orderId, reason } = parsed.data;
    const supabase = createAdminSupabase();

    // Fetch order details
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, email, status, payment_status, created_at, order_items(product_id, quantity)")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Verify order belongs to the signed-in customer
    if (order.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "You can only cancel your own orders." }, { status: 403 });
    }

    // STRICT 24-HOUR CANCELLATION WINDOW
    const placedTime = new Date(order.created_at).getTime();
    const hoursElapsed = (Date.now() - placedTime) / (1000 * 60 * 60);
    if (hoursElapsed > 24) {
      return NextResponse.json(
        { error: "Cancellation window has expired. Orders can only be cancelled within 24 hours of placement." },
        { status: 400 }
      );
    }

    // Check if already dispatched with courier or delivered
    if (["shipped", "delivered"].includes(order.status)) {
      return NextResponse.json(
        { error: "This parcel has already been handed to Shree Mahavir Courier for delivery and cannot be cancelled." },
        { status: 400 }
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "This order is already cancelled." }, { status: 400 });
    }

    // Update orders table to cancelled
    const nowIso = new Date().toISOString();
    await supabase.from("orders").update({
      status: "cancelled",
      updated_at: nowIso,
    }).eq("id", orderId);

    // Update seller_fulfillments table to cancelled
    await supabase.from("seller_fulfillments").update({
      status: "cancelled",
      updated_at: nowIso,
    }).eq("order_id", orderId);

    // Restore stock inventory for items
    for (const item of order.order_items ?? []) {
      if (item.product_id && item.quantity > 0) {
        try {
          const { data: prod } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
          if (prod && typeof prod.stock === "number") {
            await supabase.from("products").update({ stock: prod.stock + item.quantity }).eq("id", item.product_id);
          }
        } catch {
          // continue with other items
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order #${order.order_number} has been cancelled successfully. Your payment will be refunded within 3-5 business days.`,
      status: "cancelled",
    });
  } catch (err: any) {
    console.error("Order cancellation failure:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to cancel order." },
      { status: 500 }
    );
  }
}
