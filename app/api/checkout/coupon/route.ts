import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { calculateOrderPricing, getPricingConfig } from "@/lib/pricing";

export const runtime = "nodejs";

const quoteSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/),
  items: z.array(z.object({ id: z.string().uuid(), quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(20),
}).strict();

export async function POST(request: Request) {
  const parsed = quoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid coupon code and refresh your bag." }, { status: 400 });
  const pricing = getPricingConfig();
  if (!pricing) return NextResponse.json({ error: "Checkout pricing is not configured yet." }, { status: 503 });

  try {
    const quantities = new Map<string, number>();
    for (const item of parsed.data.items) {
      const quantity = (quantities.get(item.id) ?? 0) + item.quantity;
      if (quantity > 20) return NextResponse.json({ error: "A fragrance quantity cannot exceed 20." }, { status: 400 });
      quantities.set(item.id, quantity);
    }

    const supabase = createAdminSupabase();
    const [couponResult, productsResult] = await Promise.all([
      supabase.from("discount_coupons").select("id, code, discount_type, discount_value, minimum_order_paise, maximum_discount_paise, starts_at, expires_at, usage_limit, usage_count, active").eq("code", parsed.data.code).maybeSingle(),
      supabase.from("products").select("id, price_paise, stock").eq("active", true).in("id", [...quantities.keys()]),
    ]);
    if (couponResult.error || productsResult.error) throw couponResult.error ?? productsResult.error;
    const coupon = couponResult.data;
    if (!coupon || !coupon.active || Date.parse(coupon.starts_at) > Date.now() || (coupon.expires_at && Date.parse(coupon.expires_at) <= Date.now()) || (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit)) {
      return NextResponse.json({ error: "This coupon is invalid, expired, or no longer available." }, { status: 400 });
    }
    if (!productsResult.data || productsResult.data.length !== quantities.size) {
      return NextResponse.json({ error: "One or more fragrances in your bag are unavailable." }, { status: 409 });
    }
    if (productsResult.data.some((product) => (quantities.get(product.id) ?? 0) > product.stock)) {
      return NextResponse.json({ error: "One or more fragrances do not have enough stock for your bag." }, { status: 409 });
    }

    const prices = new Map(productsResult.data.map((product) => [product.id, product.price_paise]));
    const subtotalPaise = [...quantities].reduce((sum, [id, quantity]) => sum + (prices.get(id) ?? 0) * quantity, 0);
    if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise <= 0) return NextResponse.json({ error: "Your bag total could not be confirmed." }, { status: 400 });
    if (subtotalPaise < coupon.minimum_order_paise) return NextResponse.json({ error: `Add items worth ${Math.ceil((coupon.minimum_order_paise - subtotalPaise) / 100)} more to use this coupon.` }, { status: 400 });

    let discountPaise = coupon.discount_type === "percentage"
      ? Math.round(subtotalPaise * coupon.discount_value / 100)
      : coupon.discount_value;
    if (coupon.maximum_discount_paise !== null) discountPaise = Math.min(discountPaise, coupon.maximum_discount_paise);
    discountPaise = Math.min(discountPaise, subtotalPaise);
    const basePricing = calculateOrderPricing(subtotalPaise, pricing);
    const discountedPricing = calculateOrderPricing(subtotalPaise - discountPaise, {
      ...pricing,
      shippingFlatPaise: 0,
      freeShippingThresholdPaise: null,
    });
    const totalPaise = subtotalPaise - discountPaise + basePricing.shippingPaise + (discountedPricing.taxIncluded ? 0 : discountedPricing.taxPaise);
    if (discountPaise <= 0 || totalPaise <= 0) return NextResponse.json({ error: "This coupon cannot be applied to the current order." }, { status: 400 });

    return NextResponse.json({
      code: coupon.code,
      subtotalPaise,
      discountPaise,
      shippingPaise: basePricing.shippingPaise,
      taxPaise: discountedPricing.taxPaise,
      taxIncluded: discountedPricing.taxIncluded,
      totalPaise,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Coupon validation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not validate this coupon right now." }, { status: 503 });
  }
}