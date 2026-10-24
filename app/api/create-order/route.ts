import { NextResponse } from "next/server";
import { z } from "zod";
import { createRazorpay } from "@/lib/razorpay";

export const runtime = "nodejs";

const createOrderSchema = z.object({
  amount: z.number().int().min(100, "Minimum order amount is 100 paise (₹1)."),
  currency: z.string().trim().toUpperCase().default("INR"),
  receipt: z.string().trim().max(40).optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    if (!raw) {
      return NextResponse.json(
        { error: "Invalid JSON payload. Please provide amount in paise." },
        { status: 400 }
      );
    }

    const parsed = createOrderSchema.safeParse(raw);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message ?? "Invalid order parameters.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { amount, currency, receipt, notes } = parsed.data;

    let razorpayInstance;
    try {
      razorpayInstance = createRazorpay();
    } catch {
      return NextResponse.json(
        { error: "Razorpay server credentials are not configured in environment variables." },
        { status: 500 }
      );
    }

    const { client, keyId } = razorpayInstance;

    const receiptId = receipt || `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // Call Razorpay API to create an order
    const order = await (client.orders.create as any)({
      amount,
      currency,
      receipt: receiptId,
      ...(notes ? { notes } : {}),
    });

    return NextResponse.json(
      {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        key_id: keyId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("POST /api/create-order error:", error);
    const statusCode = error?.statusCode || 500;
    const message = error?.error?.description || error?.message || "Failed to create Razorpay order.";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

