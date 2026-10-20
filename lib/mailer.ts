import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail({ to, subject, html, text }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  // 1. Check Gmail / SMTP configuration first
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass.replace(/\s+/g, ""),
        },
      });

      await transporter.sendMail({
        from: `"Flovexa Perfumes" <${smtpUser}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, " "),
      });

      return { success: true };
    } catch (smtpError) {
      console.error("SMTP send error:", smtpError);
      return { success: false, error: smtpError instanceof Error ? smtpError.message : "SMTP sending failed" };
    }
  }

  // 2. Check Resend configuration
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ORDER_FROM_EMAIL || "onboarding@resend.dev";

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, " "),
      });

      if (error) {
        console.error("Resend send error:", error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (resendError) {
      console.error("Resend send error:", resendError);
      return { success: false, error: resendError instanceof Error ? resendError.message : "Resend sending failed" };
    }
  }

  return {
    success: false,
    error: "No email service configured. Please add SMTP_USER & SMTP_PASS (Gmail App Password) or RESEND_API_KEY in .env.local to send OTP to Gmail.",
  };
}

