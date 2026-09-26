import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createRazorpay } from "@/lib/razorpay";
import { getPricingConfig } from "@/lib/pricing";

export const runtime = "nodejs";
const checkoutSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(20),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    phone: z.string().trim().regex(/^[+\d][\d\s()-]{7,18}$/),
    address: z.object({
      line1: z.string().trim().min(4).max(150),
      line2: z.string().trim().max(150).optional().default(""),
      city: z.string().trim().min(2).max(80),
      state: z.string().trim().min(2).max(80),
      pincode: z.string().trim().regex(/^\d{6}$/),
      country: z.literal("India").default("India"),
    }).strict(),
  }).strict(),
}).strict();

export async function POST(request: Request) {
  let localOrderId: string | undefined;
  try {
    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Please check your contact, address and cart details." }, { status: 400 });

    const pricing = getPricingConfig();
    if (!pricing) {
      return NextResponse.json({ error: "Checkout pricing rules are not configured yet." }, { status: 503 });
    }
    if (!process.env.RESEND_API_KEY || !process.env.ORDER_FROM_EMAIL || !process.env.ORDER_LOOKUP_PEPPER || !process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json({ error: "Order email and tracking are not configured yet." }, { status: 503 });
    }
    if (process.env.NODE_ENV === "production" && !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_")) {
      return NextResponse.json({ error: "Live payment credentials have not been configured." }, { status: 503 });
    }

    const supabase = createAdminSupabase();
    const { client, keyId } = createRazorpay();
    const { error: releaseError } = await supabase.rpc("release_expired_order_inventory");
    if (releaseError) throw new Error("Expired inventory reservations could not be reconciled.");
    const { data, error } = await supabase.rpc("create_pending_order", {
      customer: parsed.data.customer,
      cart: parsed.data.items,
      shipping_rate: pricing.shippingFlatPaise,
      free_shipping_threshold: pricing.freeShippingThresholdPaise,
      tax_rate_bps: pricing.taxRateBps,
      pricing_tax_mode: pricing.taxMode,
    });
    if (error) {
      console.error("Order reservation failed", error.message);
      return NextResponse.json({ error: "One or more fragrances are unavailable. Please refresh your bag and try again." }, { status: 409 });
    }
    const reserved = Array.isArray(data) ? data[0] : data;
    if (!reserved?.created_order_id || !reserved?.created_order_number || !Number.isSafeInteger(reserved?.created_total_paise)) {
      return NextResponse.json({ error: "We could not prepare this order. Please try again." }, { status: 409 });
    }
    localOrderId = String(reserved.created_order_id);
    const orderNumber = String(reserved.created_order_number);
    const totalPaise = reserved.created_total_paise;

    const createProviderOrder = client.orders.create as (params: { amount: number; currency: string; receipt: string; notes: Record<string, string> }) => Promise<{ id: string }>;
    const providerOrder = await createProviderOrder({
      amount: totalPaise,
      currency: "INR",
      receipt: orderNumber,
      notes: { local_order_id: localOrderId },
    });
    const { error: linkError } = await supabase.from("orders").update({ razorpay_order_id: providerOrder.id }).eq("id", localOrderId);
    if (linkError) throw new Error("Could not attach the payment order to the local order.");

    return NextResponse.json({
      keyId,
      razorpayOrderId: providerOrder.id,
      localOrderId,
      orderNumber,
      amountPaise: totalPaise,
      subtotalPaise: reserved.created_subtotal_paise,
      shippingPaise: reserved.created_shipping_paise,
      taxPaise: reserved.created_tax_paise,
      taxIncluded: pricing.taxMode === "inclusive",
      currency: "INR",
      items: reserved.reserved_items,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (localOrderId) {
      try { await createAdminSupabase().rpc("cancel_pending_order", { order_uuid: localOrderId }); } catch { /* retain original checkout error */ }
    }
    const message = error instanceof Error ? error.message : "Checkout is temporarily unavailable.";
    console.error("Checkout setup failed", message);
    const missingConfiguration = message.includes("not configured");
    return NextResponse.json({ error: missingConfiguration ? "Online checkout is being set up. Please try again soon." : "We could not start secure checkout. Please try again." }, { status: missingConfiguration ? 503 : 502 });
  }
}
