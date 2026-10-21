import { NextResponse } from "next/server";
import { normalizeEmail, otpStore } from "../store";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = body?.email ? normalizeEmail(body.email) : "";

    if (!rawEmail) {
      return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    otpStore.set(rawEmail, { otp, expiresAt });

    const html = `
      <div style="margin:0;padding:40px 20px;background:#f5f2eb;font-family:'DM Sans',Arial,sans-serif;color:#28231d">
        <div style="max-width:520px;margin:0 auto;background:#fffdf9;padding:36px;border:1px solid #e7ded0;box-shadow:0 4px 20px rgba(40,35,29,0.04);border-radius:6px">
          <div style="letter-spacing:4px;font-size:11px;font-weight:600;color:#9b754a;text-transform:uppercase;margin-bottom:24px">
            FLOVEXA PERFUMES
          </div>
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;margin:0 0 16px;color:#201c17">
            Your verification code
          </h1>
          <p style="font-size:14px;line-height:1.7;color:#6d655a;margin:0 0 24px">
            Welcome to Flovexa Perfumes. Please enter this 6-digit secret code on the customer registration page to verify your email address:
          </p>
          <div style="background:#f4eee2;border:1px dashed #c4a77d;padding:20px;text-align:center;margin:0 0 24px;border-radius:6px">
            <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:12px;color:#201c17;display:inline-block">
              ${otp}
            </span>
          </div>
          <p style="font-size:12px;color:#8a8174;line-height:1.6;margin:0">
            This verification code is valid for 10 minutes. If you did not request this verification code, please ignore this email.
          </p>
        </div>
      </div>
    `;

    const text = `Your Flovexa verification code is: ${otp}\n\nThis code expires in 10 minutes. Enter this code on the website to verify your email.`;

    const sendResult = await sendMail({
      to: rawEmail,
      subject: `${otp} is your Flovexa verification code`,
      html,
      text,
    });

    if (!sendResult.success) {
      const hasEmailConfig = Boolean(
        process.env.SMTP_USER || process.env.GMAIL_USER || process.env.RESEND_API_KEY
      );

      // If no email service is configured yet, provide a development OTP so registration is never blocked
      if (!hasEmailConfig) {
        console.log(`\n========================================`);
        console.log(`[FLOVEXA OTP] Email: ${rawEmail}`);
        console.log(`[FLOVEXA OTP] Code:  ${otp}`);
        console.log(`========================================\n`);
        return NextResponse.json({
          ok: true,
          devOtp: otp,
          message: `Email service abhi connect nahi hai. Testing ke liye aapka code: ${otp} hai. (Direct Gmail me bhejne ke liye Gmail App Password .env.local me add karein).`,
        });
      }

      console.error("Email send failed:", sendResult.error);
      return NextResponse.json({
        error: sendResult.error || "Could not deliver email to your Gmail address. Please check email service configuration in .env.local.",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `A 6-digit secret code has been sent to ${rawEmail}. Please check your Gmail inbox or spam folder.`,
    });
  } catch (error) {
    console.error("OTP generation error:", error);
    return NextResponse.json({ error: "Could not generate verification code." }, { status: 500 });
  }
}
