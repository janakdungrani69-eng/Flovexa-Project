import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCustomerUser } from "@/lib/supabase/customer-user";

export const runtime = "nodejs";
const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[+\d][\d\s()-]{7,18}$/),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).default("prefer_not_to_say"),
}).strict();

export async function GET() {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your account." }, { status: 401 });
  try {
    const supabase = createAdminSupabase();
    const [profileResult, addressResult, wishlistResult, orderResult, returnsResult, reviewsResult] = await Promise.all([
      supabase.from("customer_profiles").upsert({ user_id: user.id, full_name: user.user_metadata?.full_name ?? "", phone: user.user_metadata?.phone ?? "" }, { onConflict: "user_id" }).select("user_id"),
      supabase.from("customer_addresses").select("id, label, full_name, phone, line1, line2, city, state, pincode, is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("customer_wishlist").select("product_id, products(id, slug, name, category, price_paise, size, image_url, accent)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("id, order_number, customer_name, phone, shipping_address, status, payment_status, total_paise, created_at, tracking_carrier, tracking_number, tracking_url, order_items(id, product_id, product_name, product_slug, size, quantity)").eq("email", (user.email ?? "").toLowerCase()).order("created_at", { ascending: false }).limit(50),
      supabase.from("return_requests").select("id, order_id, reason, details, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("product_reviews").select("id, order_id, product_id, product_name, product_slug, rating, title, comment, created_at").or(`user_id.eq.${user.id},customer_email.eq.${(user.email ?? "").toLowerCase()}`).order("created_at", { ascending: false }).then((res) => res, () => ({ data: [], error: null })),
    ]);
    const rawOrders = orderResult.data ?? [];
    const duplicateDraftIdsToCancel: string[] = [];
    const sanitizedOrders: typeof rawOrders = [];
    let hasKeptPendingDraft = false;

    for (const order of rawOrders) {
      if (order.status === "cancelled") {
        if (order.payment_status === "captured") {
          sanitizedOrders.push(order);
        }
        continue;
      }

      if (order.status === "pending_payment") {
        if (hasKeptPendingDraft) {
          duplicateDraftIdsToCancel.push(order.id);
          continue;
        }
        hasKeptPendingDraft = true;
      }

      sanitizedOrders.push(order);
    }

    if (duplicateDraftIdsToCancel.length > 0) {
      void supabase
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .in("id", duplicateDraftIdsToCancel);
    }

    const orderIds = sanitizedOrders.map((order) => order.id);
    const shipmentResult = orderIds.length
      ? await supabase.from("seller_fulfillments").select("order_id, status, tracking_carrier, tracking_number, tracking_url, seller_profiles(store_name)").in("order_id", orderIds)
      : { data: [], error: null };
    const failure = profileResult.error ?? addressResult.error ?? wishlistResult.error ?? orderResult.error ?? returnsResult.error ?? shipmentResult.error;
    if (failure) {
      console.error("Account query partial failure:", failure);
      throw failure;
    }
    function parsePrimaryImage(imageUrl: string | null): string | null {
      if (!imageUrl) return null;
      const trimmed = imageUrl.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
            return parsed[0];
          }
        } catch {}
      }
      if (trimmed.includes(",")) {
        const first = trimmed.split(",")[0]?.trim();
        if (first) return first;
      }
      return trimmed;
    }

    const { data: profile } = await supabase.from("customer_profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle();
    const wishlist = (wishlistResult.data ?? []).flatMap((entry) => {
      const product = entry.products as unknown as { id: string; slug: string; name: string; category: string; price_paise: number; size: string; image_url: string | null; accent: string } | null;
      return product ? [{ ...product, image_url: parsePrimaryImage(product.image_url), product_id: entry.product_id }] : [];
    });
    const shipmentsByOrder = new Map<string, typeof shipmentResult.data>();
    for (const shipment of shipmentResult.data ?? []) {
      const current = shipmentsByOrder.get(shipment.order_id) ?? [];
      current.push(shipment);
      shipmentsByOrder.set(shipment.order_id, current);
    }
    return NextResponse.json({
      email: user.email,
      profile: {
        full_name: profile?.full_name || user.user_metadata?.full_name || "",
        phone: profile?.phone || user.user_metadata?.phone || "",
        gender: user.user_metadata?.gender ?? "prefer_not_to_say",
      },
      addresses: addressResult.data ?? [],
      wishlist,
      orders: sanitizedOrders.map((order) => ({ ...order, seller_fulfillments: shipmentsByOrder.get(order.id) ?? [] })),
      returns: returnsResult.data ?? [],
      reviews: reviewsResult.data ?? [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Customer account could not be loaded:", error);
    return NextResponse.json({ error: "Your account data is unavailable. Please confirm the latest account migration has been applied." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter your name and a valid mobile number." }, { status: 400 });
  const adminSupabase = createAdminSupabase();
  const { error } = await adminSupabase.from("customer_profiles").upsert({
    user_id: user.id,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Could not save your profile." }, { status: 503 });

  // Update user metadata in Supabase auth
  await adminSupabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      gender: parsed.data.gender,
    }
  });

  return NextResponse.json({ profile: { full_name: parsed.data.fullName, phone: parsed.data.phone, gender: parsed.data.gender } }, { headers: { "Cache-Control": "no-store" } });
}
