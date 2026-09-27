import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

const statusSchema = z.object({ status: z.enum(["under_review", "approved", "declined"]) }).strict();
const nextStates: Record<string, string[]> = { requested: ["under_review", "approved", "declined"], under_review: ["approved", "declined"], approved: [], declined: [], refunded: [] };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const [{ id }, body] = await Promise.all([params, request.json()]);
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid return request." }, { status: 400 });
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid review status." }, { status: 400 });
  try {
    const supabase = createAdminSupabase();
    const { data: current, error: loadError } = await supabase.from("return_requests").select("id, status").eq("id", id).maybeSingle();
    if (loadError || !current) return NextResponse.json({ error: "Return request not found." }, { status: 404 });
    if (!nextStates[current.status]?.includes(parsed.data.status)) return NextResponse.json({ error: "That review status change is not allowed." }, { status: 409 });
    const { data, error } = await supabase.from("return_requests").update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq("id", id).select("id, status").single();
    if (error) throw error;
    return NextResponse.json({ returnRequest: data });
  } catch (error) {
    console.error("Return request update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not update this return request." }, { status: 500 });
  }
}
