import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCustomerUser } from "@/lib/supabase/customer-user";

export const runtime = "nodejs";
const returnSchema = z.object({ orderId: z.string().uuid(), reason: z.enum(["damaged", "wrong_item", "quality", "other"]), details: z.string().trim().max(1000).default("") }).strict();

export async function POST(request: Request) {
  const user = await getCustomerUser();
  if (!user || !user.email) return NextResponse.json({ error: "Sign in to request help with an order." }, { status: 401 });
  const parsed = returnSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the order and return-request details." }, { status: 400 });
  const supabase = createAdminSupabase();
  const { data: order, error: orderError } = await supabase.from("orders").select("id, status, payment_status")
    .eq("id", parsed.data.orderId).eq("email", user.email.toLowerCase()).maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: "We could not find that order in your account." }, { status: 404 });
  if (order.payment_status !== "captured" || ["cancelled", "refunded", "pending_payment", "payment_review"].includes(order.status)) {
    return NextResponse.json({ error: "A return request is not available for this order status." }, { status: 409 });
  }
  const { data, error } = await supabase.from("return_requests").insert({ user_id: user.id, order_id: order.id, reason: parsed.data.reason, details: parsed.data.details })
    .select("id, order_id, reason, details, status, created_at").single();
  if (error?.code === "23505") return NextResponse.json({ error: "A return request has already been submitted for this order." }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: "Could not submit your return request." }, { status: 503 });
  return NextResponse.json({ returnRequest: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
