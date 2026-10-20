import { NextResponse } from "next/server";
import { Resend } from "resend";
import { normalizeEmail, normalizePhone, otpStore } from "../store";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = body?.email ? normalizeEmail(body.email) : "";
    const rawPhone = body?.phone ? normalizePhone(body.phone) : "";

    if (!rawEmail && !rawPhone) {
      return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
    }

    const isEmail = Boolean(rawEmail);
    const identifier = isEmail ? rawEmail : rawPhone;

    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!isEmail && !/^[+]?[-0-9\s()]{7,18}$/.test(rawPhone)) {
      return NextResponse.json({ error: "Please enter a valid mobile number." }, { status: 400 });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    otpStore.set(identifier, { otp, expiresAt });

    let emailSent = false;
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.ORDER_FROM_EMAIL;

    if (isEmail && apiKey && fromEmail) {
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: fromEmail,
          to: rawEmail,
          subject: `${otp} is your Flovexa verification code`,
          html: `
            <div style="margin:0;padding:40px 20px;background:#f5f2eb;font-family:'DM Sans',Arial,sans-serif;color:#28231d">
              <div style="max-width:520px;margin:0 auto;background:#fffdf9;padding:36px;border:1px solid #e7ded0;box-shadow:0 4px 20px rgba(40,35,29,0.04)">
                <div style="letter-spacing:4px;font-size:11px;font-weight:600;color:#9b754a;text-transform:uppercase;margin-bottom:24px">
                  FLOVEXA PERFUMES
                </div>
                <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;margin:0 0 16px;color:#201c17">
                  Verify your email
                </h1>
                <p style="font-size:14px;line-height:1.7;color:#6d655a;margin:0 0 24px">
                  Welcome to Flovexa Perfumes. Please use this secret 6-digit verification code to complete your customer account registration:
                </p>
                <div style="background:#f4eee2;border:1px dashed #c4a77d;padding:18px;text-align:center;margin:0 0 24px;border-radius:4px">
                  <span style="font-family:monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#201c17">
                    ${otp}
                  </span>
                </div>
                <p style="font-size:12px;color:#8a8174;line-height:1.6;margin:0">
                  This code is valid for 10 minutes. If you did not request this verification code, you can safely ignore this email.
                </p>
              </div>
            </div>
          `,
          text: `Your Flovexa verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore.`,
        });
        emailSent = true;
      } catch (mailError) {
        console.error("Resend OTP send error:", mailError);
      }
    }

    const showOtpInResponse = process.env.NODE_ENV !== "production" || !emailSent;

    return NextResponse.json({
      ok: true,
      otp: showOtpInResponse ? otp : undefined,
      message: emailSent
        ? `A 6-digit secret code has been sent to ${rawEmail}.`
        : showOtpInResponse
          ? `Development Verification Code: ${otp}`
          : "Verification code sent.",
    });
  } catch (error) {
    console.error("OTP generation error:", error);
    return NextResponse.json({ error: "Could not generate verification code." }, { status: 500 });
  }
}
