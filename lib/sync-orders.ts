import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createRazorpay } from "@/lib/razorpay";
import { sendOrderEmail } from "@/lib/order-email";

export async function syncPendingRazorpayOrders(): Promise<{ synced: number; orders: string[] }> {
  const syncedOrderNumbers: string[] = [];
  try {
    const supabase = createAdminSupabase();
    const { client } = createRazorpay();

    // 1. Fetch pending_payment orders created in the last 7 days that have a razorpay_order_id
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingOrders, error } = await supabase
      .from("orders")
      .select("id, order_number, razorpay_order_id, total_paise, customer_name, email, phone, status, payment_status")
      .eq("status", "pending_payment")
      .not("razorpay_order_id", "is", null)
      .gt("created_at", sevenDaysAgo)
      .limit(30);

    if (error || !pendingOrders || pendingOrders.length === 0) {
      return { synced: 0, orders: [] };
    }

    for (const order of pendingOrders) {
      if (!order.razorpay_order_id) continue;
      try {
        const rzpOrder: any = await client.orders.fetch(order.razorpay_order_id);
        if (rzpOrder && (rzpOrder.status === "paid" || (rzpOrder.amount_paid && rzpOrder.amount_paid > 0))) {
          // Fetch captured payment
          const paymentsRes: any = await (client.orders as any).payments(order.razorpay_order_id);
          const payments = paymentsRes?.items || [];
          const captured = payments.find((p: any) => p.status === "captured") || payments[0];
          const paymentId = captured?.id || `pay_sync_${order.razorpay_order_id}`;

          // Update in Supabase
          await supabase.from("orders").update({
            status: "paid",
            payment_status: "captured",
            razorpay_payment_id: paymentId,
            tracking_carrier: "Mahavir Express",
            payment_signature_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", order.id);

          try {
            await supabase.rpc("mark_order_paid", {
              local_order_uuid: order.id,
              provider_order_id: order.razorpay_order_id,
              provider_payment_id: paymentId,
            });
          } catch {
            // ignore rpc error if function not available
          }

          try {
            await sendOrderEmail(order.id, "order_confirmation");
          } catch {
            // ignore email deferral
          }

          syncedOrderNumbers.push(order.order_number);
        }
      } catch (err) {
        console.warn(`[syncPendingRazorpayOrders] Check failed for order ${order.order_number}:`, err);
      }
    }
  } catch (err) {
    console.error("[syncPendingRazorpayOrders] General error:", err);
  }

  return { synced: syncedOrderNumbers.length, orders: syncedOrderNumbers };
}
