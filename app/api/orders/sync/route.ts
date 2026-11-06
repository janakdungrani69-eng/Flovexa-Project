import { NextResponse } from "next/server";
import { syncPendingRazorpayOrders } from "@/lib/sync-orders";
import { syncAllShippedOrders } from "@/lib/courier-tracking";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminSupabase();
    const [ordersResult, trackingResult, recentDb] = await Promise.all([
      syncPendingRazorpayOrders(),
      syncAllShippedOrders(),
      supabase
        .from("orders")
        .select("id, order_number, status, payment_status, total_paise, customer_name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      ok: true,
      orders: ordersResult,
      delivery: trackingResult,
      recentDbOrders: recentDb.data,
      recentDbError: recentDb.error?.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err), stack: err?.stack },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
