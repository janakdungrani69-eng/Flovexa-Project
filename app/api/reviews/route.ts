import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCustomerUser } from "@/lib/supabase/customer-user";

export const runtime = "nodejs";

const reviewSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  productId: z.string().optional().nullable(),
  productSlug: z.string().optional().nullable(),
  productName: z.string().min(1, "Product name is required"),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2, "Review title must be at least 2 characters").max(150),
  comment: z.string().min(5, "Review must be at least 5 characters").max(3000),
  location: z.string().max(80).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const productSlug = searchParams.get("productSlug");
    const featured = searchParams.get("featured");
    const orderId = searchParams.get("orderId");

    const supabase = createAdminSupabase();
    let query = supabase
      .from("product_reviews")
      .select("id, product_id, product_slug, product_name, customer_name, location, rating, title, comment, verified_purchase, featured, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (productId && productSlug) {
      query = query.or(`product_id.eq.${productId},product_slug.eq.${productSlug}`);
    } else if (productId) {
      query = query.eq("product_id", productId);
    } else if (productSlug) {
      query = query.eq("product_slug", productSlug);
    }

    if (featured === "true") {
      query = query.eq("featured", true);
    }

    if (orderId) {
      query = query.eq("order_id", orderId);
    }

    const { data: reviews, error } = await query.limit(50);
    if (error) {
      console.warn("Reviews query returned error:", error.message);
      return NextResponse.json({ reviews: [] });
    }

    return NextResponse.json({ reviews: reviews ?? [] });
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json({ reviews: [] });
  }
}

export async function POST(request: Request) {
  const user = await getCustomerUser();
  if (!user || !user.email) {
    return NextResponse.json(
      { error: "You must be signed in to submit a review." },
      { status: 401 }
    );
  }

  const rawJson = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(rawJson);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Invalid review data.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { orderId, productId, productSlug, productName, rating, title, comment, location } = parsed.data;

  try {
    const supabase = createAdminSupabase();

    // 1. Verify that order exists, belongs to this customer, and is DELIVERED
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, email, status, shipping_address")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Order not found. Please check your purchase history." },
        { status: 404 }
      );
    }

    if (order.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You can only review fragrances from your own orders." },
        { status: 403 }
      );
    }

    // STRICT CHECK: Can only review if order has reached the customer ('delivered')
    if (order.status !== "delivered") {
      return NextResponse.json(
        {
          error: "You can submit your fragrance rating & review once this order is successfully delivered to you.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch customer full name if available
    const { data: customerProfile } = await supabase
      .from("customer_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const customerName =
      customerProfile?.full_name ||
      user.user_metadata?.full_name ||
      (user.email.split("@")[0] ? user.email.split("@")[0].replace(/[._]/g, " ") : "Flovexa Connoisseur");

    const resolvedCity =
      location ||
      (order.shipping_address as any)?.city ||
      "India";

    // 3. Check if review already exists for this order & product
    const { data: existingReview } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("order_id", order.id)
      .eq("product_name", productName)
      .maybeSingle();

    let savedReview;
    if (existingReview) {
      const { data, error } = await supabase
        .from("product_reviews")
        .update({
          rating,
          title,
          comment,
          customer_name: customerName,
          location: resolvedCity,
          product_id: productId || null,
          product_slug: productSlug || null,
          verified_purchase: true,
          featured: rating >= 4,
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReview.id)
        .select()
        .single();

      if (error) throw error;
      savedReview = data;
    } else {
      const { data, error } = await supabase
        .from("product_reviews")
        .insert({
          order_id: order.id,
          order_number: order.order_number,
          product_id: productId || null,
          product_slug: productSlug || null,
          product_name: productName,
          user_id: user.id,
          customer_name: customerName,
          customer_email: user.email.toLowerCase(),
          location: resolvedCity,
          rating,
          title,
          comment,
          verified_purchase: true,
          featured: rating >= 4,
          status: "approved",
        })
        .select()
        .single();

      if (error) throw error;
      savedReview = data;
    }

    return NextResponse.json({
      success: true,
      review: savedReview,
      message: "Thank you for sharing your experience! Your verified review is now live.",
    });
  } catch (error: any) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: error?.message || "Could not publish your review. Please try again." },
      { status: 500 }
    );
  }
}

