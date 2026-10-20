import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

export const runtime = "nodejs";

const createSellerSchema = z.object({
  userId: z.uuid(),
  storeName: z.string().trim().min(2).max(100),
}).strict();

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const parsed = createSellerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a customer and enter a valid store name." }, { status: 400 });

  const supabase = createAdminSupabase();
  try {
    const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(parsed.data.userId);
    if (authError) throw authError;
    const target = authResult.user;
    if (!target?.email) return NextResponse.json({ error: "Customer account not found." }, { status: 404 });
    if (target.app_metadata?.role && target.app_metadata.role !== "customer") {
      return NextResponse.json({ error: "Only customer accounts can be granted seller access." }, { status: 409 });
    }

    const { data: existingProfile, error: profileLoadError } = await supabase.from("seller_profiles").select("user_id").eq("user_id", target.id).maybeSingle();
    if (profileLoadError) throw profileLoadError;
    if (existingProfile) return NextResponse.json({ error: "This account already has a seller profile." }, { status: 409 });

    const { error: roleError } = await supabase.auth.admin.updateUserById(target.id, {
      app_metadata: { ...target.app_metadata, role: "seller" },
    });
    if (roleError) throw roleError;

    const { data: profile, error: profileError } = await supabase.from("seller_profiles").insert({
      user_id: target.id,
      store_name: parsed.data.storeName,
      status: "active",
    }).select("user_id, store_name, status, created_at, admin_note").single();
    if (profileError) {
      const { error: rollbackError } = await supabase.auth.admin.updateUserById(target.id, { app_metadata: target.app_metadata });
      if (rollbackError) console.error("Seller role rollback failed", rollbackError.message);
      throw profileError;
    }

    return NextResponse.json({ seller: {
      id: target.id,
      email: target.email,
      store_name: profile.store_name,
      status: profile.status,
      created_at: profile.created_at,
      admin_note: profile.admin_note,
    } }, { status: 201 });
  } catch (error) {
    console.error("Seller account creation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not grant seller access. Check the latest seller migration and try again." }, { status: 503 });
  }
}