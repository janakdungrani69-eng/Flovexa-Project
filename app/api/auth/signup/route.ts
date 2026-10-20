import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeEmail, otpStore } from "../otp/store";

export const runtime = "nodejs";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  phone: z.string().trim().regex(/^[+\d][\d\s()-]{7,18}$/, "Enter a valid mobile number"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).default("prefer_not_to_say"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
}).strict();

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = signupSchema.safeParse(json);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please provide valid information.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { fullName, phone, gender, email, password } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    // Verify that the email was verified via OTP within the last 15 minutes
    const record = otpStore.get(normalizedEmail);
    if (!record || !record.verifiedAt || Date.now() - record.verifiedAt > 15 * 60 * 1000) {
      return NextResponse.json({
        error: "Please verify your email address with the secret code (OTP) first.",
      }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabase();

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError && existingUsers?.users) {
      const found = existingUsers.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (found) {
        return NextResponse.json({
          error: "An account with this email already exists. Please sign in instead.",
        }, { status: 409 });
      }
    }

    // Create verified user directly with password and customer role
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        gender,
      },
      app_metadata: {
        role: "customer",
      },
    });

    if (createError) {
      console.error("Admin createUser error:", createError.message);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Ensure customer profile row exists in customer_profiles
    if (newUser?.user?.id) {
      try {
        await supabaseAdmin.from("customer_profiles").upsert({
          user_id: newUser.user.id,
          full_name: fullName,
          phone,
        }, { onConflict: "user_id" });
      } catch (profileError) {
        console.error("Customer profile creation error:", profileError);
      }
    }

    // Clear OTP record
    otpStore.delete(normalizedEmail);

    return NextResponse.json({
      ok: true,
      message: "Customer account created successfully.",
      user: {
        id: newUser?.user?.id,
        email: normalizedEmail,
        fullName,
      },
    });
  } catch (error) {
    console.error("Signup handler error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not create account.",
    }, { status: 500 });
  }
}

