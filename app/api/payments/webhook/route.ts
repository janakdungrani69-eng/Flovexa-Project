import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendOrderEmail } from "@/lib/order-email";

export const runtime = "nodejs";

function safeSignatureEqual(expectedHex: string, receivedHex: string) {
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!/^[a-f0-9]{64}$/i.test(signature) || !safeSignatureEqual(expected, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } } };
  };
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid webhook body." }, { status: 400 }); }

  const eventId = request.headers.get("x-razorpay-event-id") || createHash("sha256").update(rawBody).digest("hex");
  const supabase = createAdminSupabase();
  const { error: insertError } = await supabase.from("webhook_events").insert({ id: eventId, event_type: event.event ?? "unknown" });
  if (insertError?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  if (insertError) {
    console.error("Could not record Razorpay webhook", insertError.message);
    return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
  }

  try {
    const payment = event.payload?.payment?.entity;
    if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id && payment.id) {
      const { data: order } = await supabase.from("orders").select("id, total_paise").eq("razorpay_order_id", payment.order_id).maybeSingle();
      if (order && payment.amount === order.total_paise && payment.currency === "INR") {
        const { error } = await supabase.rpc("mark_order_paid", {
          local_order_uuid: order.id,
          provider_order_id: payment.order_id,
          provider_payment_id: payment.id,
        });
        if (error) throw error;
        const { data: finalOrder } = await supabase.from("orders").select("status, payment_status").eq("id", order.id).maybeSingle();
        if (finalOrder?.payment_status === "captured") {
          try { await sendOrderEmail(order.id, finalOrder.status === "payment_review" ? "payment_review" : "order_confirmation"); }
          catch (emailError) { console.error("Order confirmation email deferred", emailError instanceof Error ? emailError.message : "Unknown error"); }
        }
      }
    } else if (event.event === "payment.failed" && payment?.order_id) {
      const { data: order } = await supabase.from("orders").select("id").eq("razorpay_order_id", payment.order_id).maybeSingle();
      if (order) {
        const { error } = await supabase.rpc("cancel_pending_order", { order_uuid: order.id });
        if (error) throw error;
      }
    }
    const { error: processedError } = await supabase.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", eventId);
    if (processedError) throw processedError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    await supabase.from("webhook_events").delete().eq("id", eventId);
    console.error("Razorpay webhook processing failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Webhook processing failed; provider may retry." }, { status: 500 });
  }
}
