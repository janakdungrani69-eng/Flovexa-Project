import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export const runtime = "nodejs";

const verifyPaymentSchema = z.object({
  order_id: z.string().min(1, "Order ID is required"),
  payment_id: z.string().min(1, "Payment ID is required"),
  signature: z.string().min(1, "Signature is required"),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    if (!raw) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    // Accept both snake_case and Razorpay response object properties
    const normalized = {
      order_id: raw.order_id || raw.razorpay_order_id,
      payment_id: raw.payment_id || raw.razorpay_payment_id,
      signature: raw.signature || raw.razorpay_signature,
    };

    const parsed = verifyPaymentSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required payment fields: razorpay_order_id, razorpay_payment_id, razorpay_signature",
        },
        { status: 400 }
      );
    }

    const { order_id, payment_id, signature } = parsed.data;

    // Verify HMAC-SHA256 signature
    const isValid = verifyRazorpaySignature(order_id, payment_id, signature);

    if (!isValid) {
      console.warn(`[Razorpay] Signature mismatch for order: ${order_id}, payment: ${payment_id}`);
      return NextResponse.json(
        { success: false, error: "Payment verification failed. Signature mismatch." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment signature verified successfully.",
      order_id,
      payment_id,
    });
  } catch (error: any) {
    console.error("POST /api/verify-payment error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal payment verification error." },
      { status: 500 }
    );
  }
}
