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
    if (!profile || !target || !["seller", "customer"].includes(String(target.app_metadata?.role ?? ""))) {
      return NextResponse.json({ error: "This account is not a managed seller." }, { status: 404 });
    }
    const nextRole = parsed.data.status === "active" ? "seller" : "customer";
    const { error: roleError } = await supabase.auth.admin.updateUserById(id, {
      app_metadata: { ...target.app_metadata, role: nextRole },
    });
    if (roleError) throw roleError;
    const { error: updateError } = await supabase.from("seller_profiles").update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq("user_id", id);
    if (updateError) {
      await supabase.auth.admin.updateUserById(id, { app_metadata: { ...target.app_metadata, role: target.app_metadata?.role ?? "seller" } });
      throw updateError;
    }
    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch (error) {
    console.error("Seller access update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not update seller access. Apply the latest admin migration and try again." }, { status: 503 });
  }
}
