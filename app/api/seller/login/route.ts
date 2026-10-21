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

    const role = data.user.app_metadata?.role;
    if (role !== "seller" && role !== "admin" && role !== "owner") {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Access denied. Only authorized Flovexa sellers can access this portal." },
        { status: 403 }
      );
    }

    // Verify active seller profile
    const admin = createAdminSupabase();
    const { data: profile } = await admin
      .from("seller_profiles")
      .select("status")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!profile || profile.status !== "active") {
      return NextResponse.json(
        { error: "Your seller account is not active. Please contact support." },
        { status: 403 }
      );
    }

    const targetUrl = role === "admin" ? "/admin" : "/seller";
    return NextResponse.json({ success: true, redirect: targetUrl });
  } catch (err) {
    console.error("Seller login error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign-in failed." },
      { status: 500 }
    );
  }
}

