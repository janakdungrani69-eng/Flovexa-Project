import { NextResponse } from "next/server";
import { syncPendingRazorpayOrders } from "@/lib/sync-orders";
import { syncAllShippedOrders } from "@/lib/courier-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [ordersResult, trackingResult] = await Promise.all([
      syncPendingRazorpayOrders(),
      syncAllShippedOrders(),
    ]);
    return NextResponse.json({ ok: true, orders: ordersResult, delivery: trackingResult });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Sync error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const [ordersResult, trackingResult] = await Promise.all([
      syncPendingRazorpayOrders(),
      syncAllShippedOrders(),
    ]);
    return NextResponse.json({ ok: true, orders: ordersResult, delivery: trackingResult });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Sync error" }, { status: 500 });
  }
}
