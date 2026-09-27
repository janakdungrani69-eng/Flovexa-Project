import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCustomerUser } from "@/lib/supabase/customer-user";

export const runtime = "nodejs";
const wishlistSchema = z.object({ productId: z.string().uuid() }).strict();

export async function GET() {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your saved perfumes." }, { status: 401 });
  const { data, error } = await createAdminSupabase().from("customer_wishlist").select("product_id").eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not load your saved perfumes." }, { status: 503 });
  return NextResponse.json({ productIds: (data ?? []).map((item) => item.product_id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to save a perfume." }, { status: 401 });
  const parsed = wishlistSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid perfume." }, { status: 400 });
  const supabase = createAdminSupabase();
  const { data: product, error: productError } = await supabase.from("products").select("id").eq("id", parsed.data.productId).eq("active", true).maybeSingle();
  if (productError || !product) return NextResponse.json({ error: "This perfume is no longer available." }, { status: 404 });
  const { error } = await supabase.from("customer_wishlist").upsert({ user_id: user.id, product_id: product.id }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "Could not save this perfume." }, { status: 503 });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your saved perfumes." }, { status: 401 });
  const parsed = wishlistSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid perfume." }, { status: 400 });
  const { error } = await createAdminSupabase().from("customer_wishlist").delete().eq("user_id", user.id).eq("product_id", parsed.data.productId);
  if (error) return NextResponse.json({ error: "Could not remove this perfume." }, { status: 503 });
  return NextResponse.json({ saved: false });
}
