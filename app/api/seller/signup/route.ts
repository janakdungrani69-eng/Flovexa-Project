import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const sellerSignupSchema = z.object({
  storeName: z.string().trim().min(2, "Store name must be at least 2 characters").max(100),
  fullName: z.string().trim().min(2, "Contact person name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().regex(/^[+\d][\d\s()-]{7,18}$/, "Enter a valid 10-digit mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
}).strict();

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = sellerSignupSchema.safeParse(json);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please provide valid merchant information.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { storeName, fullName, email, phone, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const supabaseAdmin = createAdminSupabase();

    // Check if account already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError && existingUsers?.users) {
      const found = existingUsers.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (found) {
        return NextResponse.json({
          error: "An account with this email already exists. Please sign in with your password.",
        }, { status: 409 });
      }
    }

    // Create user with customer role and pending seller status
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        store_name: storeName,
      },
      app_metadata: {
        role: "customer",
        seller_status: "pending_approval",
      },
    });

    if (createError || !newUser?.user) {
      console.error("Seller createUser error:", createError?.message);
      return NextResponse.json({
        error: createError?.message ?? "Could not create merchant account.",
      }, { status: 400 });
    }

    // Create entry in seller_profiles as suspended with PENDING_APPROVAL flag
    const { error: profileError } = await supabaseAdmin.from("seller_profiles").upsert({
      user_id: newUser.user.id,
      store_name: storeName,
      status: "suspended",
      admin_note: `PENDING_APPROVAL: Registered by ${fullName} (${phone}) on ${new Date().toISOString()}`,
    }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Seller profile upsert error:", profileError);
    }

    return NextResponse.json({
      ok: true,
      pending: true,
      message: "Your seller application has been submitted to the Flovexa Store Owner for approval. Once approved, your seller portal will be activated.",
      user: {
        id: newUser.user.id,
        email: normalizedEmail,
        storeName,
      },
    });
  } catch (error) {
    console.error("Seller signup handler error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not complete seller registration.",
    }, { status: 500 });
  }
}
