import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSeller } from "@/lib/supabase/seller-user";

export const runtime = "nodejs";

const profileSchema = z.object({
  storeName: z.string().trim().min(2, "Store name must be at least 2 characters").max(100),
}).strict();

export async function GET() {
  try {
    const seller = await getActiveSeller();
    if (!seller) {
      return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });
    }

    return NextResponse.json({
      storeName: seller.profile.store_name,
      email: seller.user.email,
      fullName: seller.user.user_metadata?.full_name ?? "",
      phone: seller.user.user_metadata?.phone ?? "",
      status: seller.profile.status,
    });
  } catch (error) {
    console.error("Seller profile GET error:", error);
    return NextResponse.json({ error: "Could not load seller profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const seller = await getActiveSeller();
    if (!seller) {
      return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = profileSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile data." }, { status: 400 });
    }

    const { storeName } = parsed.data;

    const { error: profileError } = await seller.supabase
      .from("seller_profiles")
      .update({ store_name: storeName, updated_at: new Date().toISOString() })
      .eq("user_id", seller.user.id);

    if (profileError) throw profileError;

    return NextResponse.json({
      ok: true,
      message: "Store details updated successfully.",
      storeName,
    });
  } catch (error) {
    console.error("Seller profile PATCH error:", error);
    return NextResponse.json({ error: "Could not update seller profile." }, { status: 500 });
  }
}
