import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return NextResponse.json({ error: "Please enter your seller email and password." }, { status: 400 });
    }

    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);

    const cookieStore = await cookies();
    let response = NextResponse.json({ success: true, redirect: "/seller" });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid seller email or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    const isOwnerEmail =
      email === "janakdungrani69@gmail.com" ||
      email === "businessflovax@gmail.com";

    let role = data.user.app_metadata?.role;

    // Check seller profile in database
    let profile: { status?: string; store_name?: string } | null = null;
    let admin: ReturnType<typeof createAdminSupabase> | null = null;
    try {
      admin = createAdminSupabase();
      const { data: p } = await admin
        .from("seller_profiles")
        .select("status, store_name")
        .eq("user_id", data.user.id)
        .maybeSingle();
      profile = p;
    } catch (adminErr) {
      console.error("[seller/login] Could not check seller_profiles:", adminErr);
    }

    const isAuthorizedSeller =
      role === "seller" ||
      role === "admin" ||
      role === "owner" ||
      isOwnerEmail ||
      (profile && profile.status === "active");

    if (!isAuthorizedSeller) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Access denied. Only authorized Flovexa sellers can access this portal." },
        { status: 403 }
      );
    }

    // Auto-grant seller role in auth.users if missing
    if (admin && role !== "seller" && role !== "admin" && role !== "owner") {
      try {
        await admin.auth.admin.updateUserById(data.user.id, {
          app_metadata: { role: "seller" },
        });
        role = "seller";
      } catch (err) {
        console.error("[seller/login] Auto-assign role error:", err);
      }
    }

    // Auto-create seller profile if missing for owner
    if (admin && !profile && isOwnerEmail) {
      try {
        await admin.from("seller_profiles").upsert(
          {
            user_id: data.user.id,
            store_name: "FLOVEXA",
            status: "active",
            admin_note: "Primary authorized owner & seller: Janak Dungrani",
          },
          { onConflict: "user_id" }
        );
      } catch (err) {
        console.error("[seller/login] Auto-create profile error:", err);
      }
    }

    return NextResponse.json({ success: true, redirect: "/seller" });
  } catch (err) {
    console.error("Seller login error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign-in failed." },
      { status: 500 }
    );
  }
}
