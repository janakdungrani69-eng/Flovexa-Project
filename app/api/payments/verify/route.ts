import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createRazorpay } from "@/lib/razorpay";
import { sendOrderEmail } from "@/lib/order-email";

export const runtime = "nodejs";
const verifySchema = z.object({
  localOrderId: z.string().uuid(),
  razorpay_order_id: z.string().min(8).max(64),
  razorpay_payment_id: z.string().min(8).max(64),
  razorpay_signature: z.string().length(64).regex(/^[a-f0-9]+$/i),
}).strict();

export async function POST(request: Request) {
  try {
    const parsed = verifySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Payment confirmation details are incomplete." }, { status: 400 });
    const supabase = createAdminSupabase();
    const { keySecret, client } = createRazorpay();
    const { localOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
    const { data: order, error } = await supabase.from("orders")
      .select("id, order_number, razorpay_order_id, total_paise, customer_name, email, phone, shipping_address, created_at, status, payment_status, order_items(product_name, size, quantity, unit_price_paise, line_total_paise)")
      .eq("id", localOrderId).maybeSingle();
    if (error || !order || order.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json({ error: "We could not match this payment to your order." }, { status: 404 });
    }

    const expected = createHmac("sha256", keySecret).update(`${order.razorpay_order_id}|${razorpay_payment_id}`).digest();
    const received = Buffer.from(razorpay_signature, "hex");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const payment = await client.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== order.razorpay_order_id || payment.amount !== order.total_paise || payment.currency !== "INR") {
      return NextResponse.json({ error: "The payment amount did not match the order." }, { status: 400 });
    }
    let paymentStatus = payment.status;
    if (paymentStatus === "authorized") {
      try {
        const captured = await (client.payments as any).capture(razorpay_payment_id, order.total_paise, "INR");
        if (captured?.status === "captured") {
          paymentStatus = "captured";
        }
      } catch (capErr) {
        console.warn("Auto-capture attempt:", capErr);
      }
    }

    if (paymentStatus === "captured") {
      try {
        await supabase.rpc("mark_order_paid", {
          local_order_uuid: localOrderId,
          provider_order_id: order.razorpay_order_id,
          provider_payment_id: razorpay_payment_id,
        });
      } catch (markErr) {
        console.warn("mark_order_paid rpc handled:", markErr);
      }

      // Status remains 'paid' (new request waiting for seller to accept and pack in Seller Panel)
      await supabase.from("orders").update({
        status: "paid",
        payment_status: "captured",
        razorpay_payment_id,
        payment_signature_verified_at: new Date().toISOString(),
        tracking_carrier: "Mahavir Express",
        updated_at: new Date().toISOString(),
      }).eq("id", localOrderId);

      const { data: updatedOrder } = await supabase.from("orders")
        .select("id, order_number, customer_name, email, phone, shipping_address, total_paise, status, payment_status, created_at, tracking_carrier, tracking_number, tracking_url, order_items(product_name, size, quantity, unit_price_paise, line_total_paise)")
        .eq("id", localOrderId)
        .single();

      try {
        await sendOrderEmail(localOrderId, "order_confirmation");
      } catch (emailError) {
        console.error("Order confirmation email deferred", emailError instanceof Error ? emailError.message : "Unknown error");
      }

      return NextResponse.json({
        ok: true,
        orderNumber: order.order_number,
        paymentStatus: "captured",
        orderStatus: updatedOrder?.status || "paid",
        trackingCarrier: updatedOrder?.tracking_carrier || "Mahavir Express",
        trackingNumber: updatedOrder?.tracking_number || null,
        trackingUrl: updatedOrder?.tracking_url || null,
        order: updatedOrder || {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          phone: order.phone,
          shipping_address: order.shipping_address,
          total_paise: order.total_paise,
          status: "paid",
          payment_status: "captured",
          created_at: order.created_at || new Date().toISOString(),
          tracking_carrier: "Mahavir Express",
          tracking_number: null,
          tracking_url: null,
          order_items: order.order_items || [],
        },
      });
    }
    if (payment.status === "authorized") {
      await supabase.from("orders").update({ payment_status: "authorized", razorpay_payment_id, payment_signature_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", localOrderId).eq("status", "pending_payment");
      return NextResponse.json({ ok: true, orderNumber: order.order_number, paymentStatus: "authorized" });
    }
    return NextResponse.json({ error: "The payment has not been captured. Please contact support if money was deducted." }, { status: 409 });
  } catch (error) {
    console.error("Payment verification failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We could not confirm the payment yet. Please refresh your order status shortly." }, { status: 502 });
  }
}
