import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const [{ id }, body] = await Promise.all([params, request.json()]);
  const parsedId = z.uuid().safeParse(id);
  const parsedBody = z.object({ active: z.boolean() }).strict().safeParse(body);
  if (!parsedId.success || !parsedBody.success) return NextResponse.json({ error: "Choose a valid coupon and status." }, { status: 400 });
  const { data, error } = await createAdminSupabase().from("discount_coupons").update({ active: parsedBody.data.active }).eq("id", id).select("id, active").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Could not update this coupon." }, { status: 503 });
  return NextResponse.json({ coupon: data });
}
