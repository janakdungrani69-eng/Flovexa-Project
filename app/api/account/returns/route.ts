import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCustomerUser } from "@/lib/supabase/customer-user";

export const runtime = "nodejs";
const returnSchema = z.object({ orderId: z.string().uuid(), reason: z.enum(["damaged", "wrong_item", "quality", "other"]), details: z.string().trim().max(1000).default("") }).strict();

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Flovexa maintains a strict No-Return Policy on luxury artisanal fragrances to preserve product hygiene, purity, and bottle seal integrity. Cancellations are only permitted within 24 hours of ordering prior to courier dispatch.",
    },
    { status: 400 }
  );
}
