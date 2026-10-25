import { NextResponse } from "next/server";
import { z } from "zod";
import { syncOrderDeliveryStatus } from "@/lib/courier-tracking";

const syncSchema = z.object({
  orderId: z.string().uuid(),
  forceMarkDelivered: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order identifier." }, { status: 400 });
    }

    const result = await syncOrderDeliveryStatus(parsed.data.orderId, parsed.data.forceMarkDelivered);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Could not sync tracking status" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Tracking sync error:", error);
    return NextResponse.json({ error: "Internal tracking sync error" }, { status: 500 });
  }
}
