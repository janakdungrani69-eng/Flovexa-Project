import { NextResponse } from "next/server";
import { normalizeEmail, normalizePhone, otpStore } from "../store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = body?.email ? normalizeEmail(body.email) : "";
    const rawPhone = body?.phone ? normalizePhone(body.phone) : "";
    const otp = String(body?.otp ?? "").trim();

    const identifier = rawEmail || rawPhone;

    if (!identifier || !otp) {
      return NextResponse.json({ error: "Please enter the 6-digit verification code sent to your email." }, { status: 400 });
    }

    const record = otpStore.get(identifier);
    if (!record) {
      return NextResponse.json({ error: "No verification code found. Please request a new code." }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(identifier);
      return NextResponse.json({ error: "This code has expired. Please request a new code." }, { status: 400 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: "The verification code is incorrect." }, { status: 400 });
    }

    record.verifiedAt = Date.now();
    otpStore.set(identifier, record);

    return NextResponse.json({ ok: true, message: rawEmail ? "Email verified successfully." : "Verified successfully." });
  } catch {
    return NextResponse.json({ error: "Could not verify the code." }, { status: 500 });
  }
}
