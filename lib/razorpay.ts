import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

export function createRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay server credentials are not configured.");
  return { client: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId, keySecret };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || !orderId || !paymentId || !signature) return false;
  try {
    const expected = createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest();
    const received = Buffer.from(signature, "hex");
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
