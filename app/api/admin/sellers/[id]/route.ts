import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

const schema = z.object({ status: z.enum(["active", "suspended"]) }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const [{ id }, body] = await Promise.all([params, request.json()]);
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid seller account." }, { status: 400 });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid seller access status." }, { status: 400 });

  try {
    const supabase = createAdminSupabase();
    const [{ data: profile, error: profileError }, { data: authResult, error: authError }] = await Promise.all([
      supabase.from("seller_profiles").select("user_id").eq("user_id", id).maybeSingle(),
      supabase.auth.admin.getUserById(id),
    ]);
    if (profileError || authError) throw profileError ?? authError;
    const target = authResult.user;
    if (!profile || !target) {
      return NextResponse.json({ error: "This account is not a managed seller." }, { status: 404 });
    }
    if (parsed.data.status === "suspended") {
      const { error: productError } = await supabase.from("products").update({ active: false, updated_at: new Date().toISOString() }).eq("seller_id", id).eq("active", true);
      if (productError) throw productError;
    }
    const currentRole = String(target.app_metadata?.role ?? "");
    const nextRole = currentRole === "admin" ? "admin" : (parsed.data.status === "active" ? "seller" : "customer");
    const { error: roleError } = await supabase.auth.admin.updateUserById(id, {
      app_metadata: { ...target.app_metadata, role: nextRole, seller_status: parsed.data.status },
    });
    if (roleError) throw roleError;

    const note = parsed.data.status === "active"
      ? `Approved by store owner on ${new Date().toISOString()}`
      : `Access paused by store owner on ${new Date().toISOString()}`;

    const { error: updateError } = await supabase.from("seller_profiles").update({
      status: parsed.data.status,
      admin_note: note,
      updated_at: new Date().toISOString()
    }).eq("user_id", id);
    if (updateError) {
      await supabase.auth.admin.updateUserById(id, { app_metadata: { ...target.app_metadata, role: target.app_metadata?.role ?? "seller" } });
      throw updateError;
    }
    return NextResponse.json({ ok: true, status: parsed.data.status, admin_note: note });
  } catch (error) {
    console.error("Seller access update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not update seller access." }, { status: 503 });
  }
}
