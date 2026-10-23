import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

export const runtime = "nodejs";

const updateReviewSchema = z.object({
  id: z.string().min(1),
  featured: z.boolean().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();
    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ reviews: reviews ?? [] });
  } catch (error: any) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load reviews." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  }

  const rawJson = await request.json().catch(() => null);
  const parsed = updateReviewSchema.safeParse(rawJson);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review update payload." }, { status: 400 });
  }

  const { id, featured, status } = parsed.data;
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (featured !== undefined) updates.featured = featured;
  if (status !== undefined) updates.status = status;

  try {
    const supabase = createAdminSupabase();
    const { data: updated, error } = await supabase
      .from("product_reviews")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, review: updated });
  } catch (error: any) {
    console.error("PATCH /api/admin/reviews error:", error);
    return NextResponse.json({ error: error?.message || "Could not update review." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
  }

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("DELETE /api/admin/reviews error:", error);
    return NextResponse.json({ error: error?.message || "Could not delete review." }, { status: 500 });
  }
}

