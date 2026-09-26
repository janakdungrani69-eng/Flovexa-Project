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
      .select("id, order_number, razorpay_order_id, total_paise, status, payment_status")
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
    if (payment.status === "captured") {
      const { error: markError } = await supabase.rpc("mark_order_paid", {
        local_order_uuid: localOrderId,
        provider_order_id: order.razorpay_order_id,
        provider_payment_id: razorpay_payment_id,
      });
      if (markError) throw markError;
      const { data: finalOrder, error: finalError } = await supabase.from("orders").select("status, payment_status").eq("id", localOrderId).single();
      if (finalError || finalOrder.payment_status !== "captured") return NextResponse.json({ error: "Payment received; order confirmation is still syncing." }, { status: 202 });
      try { await sendOrderEmail(localOrderId, finalOrder.status === "payment_review" ? "payment_review" : "order_confirmation"); }
      catch (emailError) { console.error("Order confirmation email deferred", emailError instanceof Error ? emailError.message : "Unknown error"); }
      return NextResponse.json({ ok: true, orderNumber: order.order_number, paymentStatus: "captured", orderStatus: finalOrder.status });
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
