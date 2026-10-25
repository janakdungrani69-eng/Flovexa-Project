import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createRazorpay } from "@/lib/razorpay";
import { getPricingConfig } from "@/lib/pricing";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), quantity: z.number().int().min(1).max(500) }).strict()).min(1).max(100),
  couponCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/).optional(),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254),
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
  const supabase = createAdminSupabase();

  try {
    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your contact, address and cart details." }, { status: 400 });
    }

    const pricing = getPricingConfig();
    if (!pricing) {
      return NextResponse.json({ error: "Checkout pricing rules are not configured yet." }, { status: 503 });
    }

    const { client, keyId } = createRazorpay();

    // 1. Fetch products from database
    const productIds = parsed.data.items.map((i) => i.id);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("id, name, slug, price_paise, size, stock, active")
      .in("id", productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      console.error("Products lookup failed:", prodErr);
      return NextResponse.json({ error: "One or more fragrances could not be found. Please refresh your bag." }, { status: 404 });
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const cartLines: Array<{ product: typeof dbProducts[0]; quantity: number }> = [];

    for (const item of parsed.data.items) {
      const prod = productMap.get(item.id);
      if (!prod || prod.active === false) {
        return NextResponse.json({ error: "A fragrance in your bag is no longer active. Please refresh." }, { status: 409 });
      }
      // Continuous Atelier Availability: Any customer can buy any perfume anytime
      if (typeof prod.stock === "number" && prod.stock < item.quantity) {
        await supabase.from("products").update({
          stock: Math.max(250, item.quantity + 50),
          updated_at: new Date().toISOString(),
        }).eq("id", prod.id);
      }
      cartLines.push({ product: prod, quantity: item.quantity });
    }

    // 2. Compute subtotal
    const subtotalPaise = cartLines.reduce((sum, line) => sum + line.product.price_paise * line.quantity, 0);

    // 3. Optional Coupon Discount
    let discountPaise = 0;
    let couponRow: any = null;
    if (parsed.data.couponCode) {
      const { data: coupon } = await supabase
        .from("discount_coupons")
        .select("*")
        .eq("code", parsed.data.couponCode)
        .eq("active", true)
        .maybeSingle();

      if (coupon) {
        couponRow = coupon;
        if (coupon.discount_type === "percentage") {
          discountPaise = Math.round((subtotalPaise * coupon.discount_value) / 100);
        } else {
          discountPaise = coupon.discount_value;
        }
        if (coupon.maximum_discount_paise) {
          discountPaise = Math.min(discountPaise, coupon.maximum_discount_paise);
        }
        discountPaise = Math.min(discountPaise, subtotalPaise);
      }
    }

    // 4. Compute shipping & taxes
    const discountedSubtotal = subtotalPaise - discountPaise;
    const shippingPaise = pricing.freeShippingThresholdPaise && discountedSubtotal >= pricing.freeShippingThresholdPaise ? 0 : pricing.shippingFlatPaise;
    const taxPaise = pricing.taxMode === "inclusive"
      ? Math.round((discountedSubtotal * pricing.taxRateBps) / (10000 + pricing.taxRateBps))
      : pricing.taxMode === "exclusive"
      ? Math.round((discountedSubtotal * pricing.taxRateBps) / 10000)
      : 0;

    const totalPaise = discountedSubtotal + shippingPaise + (pricing.taxMode === "exclusive" ? taxPaise : 0);

    if (totalPaise < 100) {
      return NextResponse.json({ error: "Minimum order value is ₹1.00." }, { status: 400 });
    }

    // 5. Generate unique Order ID & Order Number
    localOrderId = randomUUID();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randHex = randomBytes(4).toString("hex").toUpperCase();
    const orderNumber = `FLX-${dateStr}-${randHex}`;

    // 6. Insert Order into Supabase
    const { error: orderInsertError } = await supabase.from("orders").insert({
      id: localOrderId,
      order_number: orderNumber,
      customer_name: parsed.data.customer.name,
      email: parsed.data.customer.email.toLowerCase(),
      phone: parsed.data.customer.phone,
      shipping_address: {
        ...parsed.data.customer.address,
        coupon_code: couponRow?.code || null,
        discount_paise: discountPaise,
      },
      subtotal_paise: subtotalPaise,
      shipping_paise: shippingPaise,
      tax_paise: taxPaise,
      tax_included: pricing.taxMode === "inclusive",
      total_paise: totalPaise,
      status: "pending_payment",
      payment_status: "created",
      inventory_reserved_until: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    });

    if (orderInsertError) {
      console.error("Order creation failed in database:", orderInsertError);
      throw new Error("Could not initialize your order. Please try again.");
    }

    // 7. Insert Order Items
    const itemsToInsert = cartLines.map((line) => ({
      order_id: localOrderId,
      product_id: line.product.id,
      product_name: line.product.name,
      product_slug: line.product.slug,
      size: line.product.size || "50 ml",
      unit_price_paise: line.product.price_paise,
      quantity: line.quantity,
      line_total_paise: line.product.price_paise * line.quantity,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
    if (itemsError) {
      console.error("Order items insert warning:", itemsError);
    }

    // 8. Maintain continuous atelier inventory so customers can buy as many times as they want
    for (const line of cartLines) {
      if (typeof line.product.stock === "number") {
        const remaining = Math.max(50, line.product.stock - line.quantity);
        await supabase.from("products").update({
          stock: remaining,
          updated_at: new Date().toISOString(),
        }).eq("id", line.product.id);
      }
    }

    // 9. Create Razorpay Provider Order
    const createProviderOrder = client.orders.create as (params: {
      amount: number;
      currency: string;
      receipt: string;
      notes: Record<string, string>;
    }) => Promise<{ id: string }>;

    const providerOrder = await createProviderOrder({
      amount: totalPaise,
      currency: "INR",
      receipt: orderNumber,
      notes: { local_order_id: localOrderId },
    });

    // 10. Attach Razorpay Order ID
    await supabase.from("orders").update({ razorpay_order_id: providerOrder.id }).eq("id", localOrderId);

    return NextResponse.json(
      {
        keyId,
        razorpayOrderId: providerOrder.id,
        localOrderId,
        orderNumber,
        amountPaise: totalPaise,
        subtotalPaise,
        shippingPaise,
        taxPaise,
        taxIncluded: pricing.taxMode === "inclusive",
        couponCode: couponRow?.code || null,
        discountPaise,
        currency: "INR",
        items: itemsToInsert,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (localOrderId) {
      try {
        await supabase.from("orders").update({ status: "cancelled", payment_status: "failed" }).eq("id", localOrderId);
      } catch {
        /* ignore rollback error */
      }
    }
    const message = error instanceof Error ? error.message : "Checkout is temporarily unavailable.";
    console.error("Checkout setup failed:", message);
    return NextResponse.json({ error: message || "We could not start secure checkout. Please try again." }, { status: 502 });
  }
}
