import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

export const runtime = "nodejs";
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.coerce.number().int().min(1).max(1000000),
  minimumOrder: z.coerce.number().min(0).max(1000000),
  maximumDiscount: z.union([z.coerce.number().positive().max(1000000), z.null()]),
  startsAt: z.string().datetime({ offset: true }),
  expiresAt: z.union([z.string().datetime({ offset: true }), z.null()]),
  usageLimit: z.union([z.coerce.number().int().positive().max(10000000), z.null()]),
}).strict().superRefine((value, context) => {
  if (value.discountType === "percentage" && value.discountValue > 90) context.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discounts cannot exceed 90%." });
  if (value.expiresAt && new Date(value.expiresAt) <= new Date(value.startsAt)) context.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be after the start date." });
});

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const { data, error } = await createAdminSupabase().from("discount_coupons").select("id, code, discount_type, discount_value, minimum_order_paise, maximum_discount_paise, starts_at, expires_at, usage_limit, usage_count, active, created_at").order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: "Could not load coupons. Apply the latest coupon migration." }, { status: 503 });
  return NextResponse.json({ coupons: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const parsed = couponSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the coupon code, discount and date range." }, { status: 400 });
  const value = parsed.data;
  try {
    const { data, error } = await createAdminSupabase().from("discount_coupons").insert({
      code: value.code, discount_type: value.discountType, discount_value: value.discountType === "fixed_amount" ? Math.round(value.discountValue * 100) : value.discountValue,
      minimum_order_paise: Math.round(value.minimumOrder * 100), maximum_discount_paise: value.maximumDiscount === null ? null : Math.round(value.maximumDiscount * 100),
      starts_at: value.startsAt, expires_at: value.expiresAt, usage_limit: value.usageLimit,
    }).select("id, code, discount_type, discount_value, minimum_order_paise, maximum_discount_paise, starts_at, expires_at, usage_limit, usage_count, active, created_at").single();
    if (error?.code === "23505") return NextResponse.json({ error: "That coupon code already exists." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (error) {
    console.error("Coupon creation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not create this coupon." }, { status: 503 });
  }
}
