import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSignedInUser } from "@/lib/supabase/roles";

export const runtime = "nodejs";

const upgradeSchema = z.object({
  storeName: z.string().trim().min(2, "Store name must be at least 2 characters").max(100),
}).strict();

export async function POST(request: Request) {
  try {
    const user = await getSignedInUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = upgradeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({
        error: parsed.error.issues[0]?.message ?? "Please provide a valid store name.",
      }, { status: 400 });
    }

    const { storeName } = parsed.data;
    const supabaseAdmin = createAdminSupabase();

    // Save pending seller request in app_metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...(user.app_metadata ?? {}),
        seller_status: "pending_approval",
      },
      user_metadata: {
        ...(user.user_metadata ?? {}),
        store_name: storeName,
      },
    });

    if (updateError) {
      console.error("Seller upgrade auth error:", updateError.message);
      return NextResponse.json({ error: "Could not submit seller application." }, { status: 400 });
    }

    // Upsert into seller_profiles as suspended with PENDING_APPROVAL note
    const { error: profileError } = await supabaseAdmin.from("seller_profiles").upsert({
      user_id: user.id,
      store_name: storeName,
      status: "suspended",
      admin_note: `PENDING_APPROVAL: Customer upgrade requested on ${new Date().toISOString()}`,
    }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Seller upgrade profile error:", profileError.message);
      return NextResponse.json({ error: "Could not create merchant application." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      pending: true,
      message: "Your seller upgrade request has been submitted to the Flovexa Store Owner for review and approval.",
    });
  } catch (error) {
    console.error("Seller upgrade error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not upgrade account to seller.",
    }, { status: 500 });
  }
}
