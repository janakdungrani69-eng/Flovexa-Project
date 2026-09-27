import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

const noteSchema = z.object({ note: z.string().trim().max(1000) }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const [{ id }, body] = await Promise.all([params, request.json()]);
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid customer." }, { status: 400 });
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Customer notes can be up to 1,000 characters." }, { status: 400 });
  try {
    const { error } = await createAdminSupabase().from("customer_profiles").upsert({ user_id: id, admin_note: parsed.data.note }, { onConflict: "user_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true, note: parsed.data.note });
  } catch (error) {
    console.error("Customer note update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not save this customer note. Apply the latest admin migration and try again." }, { status: 503 });
  }
}
