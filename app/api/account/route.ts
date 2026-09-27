import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCustomerUser } from "@/lib/supabase/customer-user";

export const runtime = "nodejs";
const profileSchema = z.object({ fullName: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^[+\d][\d\s()-]{7,18}$/) }).strict();

export async function GET() {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your account." }, { status: 401 });
  try {
    const supabase = createAdminSupabase();
    const [profileResult, addressResult, wishlistResult, orderResult, returnsResult] = await Promise.all([
      supabase.from("customer_profiles").upsert({ user_id: user.id, full_name: user.user_metadata?.full_name ?? "" }, { onConflict: "user_id", ignoreDuplicates: true }).select("user_id"),
      supabase.from("customer_addresses").select("id, label, full_name, phone, line1, line2, city, state, pincode, is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("customer_wishlist").select("product_id, products(id, slug, name, category, price_paise, size, image_url, accent)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("id, order_number, status, payment_status, total_paise, created_at, tracking_carrier, tracking_number, tracking_url, order_items(product_name, size, quantity)").eq("email", (user.email ?? "").toLowerCase()).order("created_at", { ascending: false }).limit(50),
      supabase.from("return_requests").select("id, order_id, reason, details, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    const failure = profileResult.error ?? addressResult.error ?? wishlistResult.error ?? orderResult.error ?? returnsResult.error;
    if (failure) throw failure;
    const { data: profile } = await supabase.from("customer_profiles").select("full_name, phone").eq("user_id", user.id).single();
    const wishlist = (wishlistResult.data ?? []).flatMap((entry) => {
      const product = entry.products as unknown as { id: string; slug: string; name: string; category: string; price_paise: number; size: string; image_url: string | null; accent: string } | null;
      return product ? [{ ...product, product_id: entry.product_id }] : [];
    });
    return NextResponse.json({
      email: user.email,
      profile: profile ?? { full_name: user.user_metadata?.full_name ?? "", phone: "" },
      addresses: addressResult.data ?? [],
      wishlist,
      orders: orderResult.data ?? [],
      returns: returnsResult.data ?? [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Customer account could not be loaded", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Your account data is unavailable. Please confirm the latest account migration has been applied." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter your name and a valid mobile number." }, { status: 400 });
  const { error } = await createAdminSupabase().from("customer_profiles").upsert({ user_id: user.id, full_name: parsed.data.fullName, phone: parsed.data.phone, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Could not save your profile." }, { status: 503 });
  return NextResponse.json({ profile: { full_name: parsed.data.fullName, phone: parsed.data.phone } }, { headers: { "Cache-Control": "no-store" } });
}
