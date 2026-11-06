import { NextResponse } from "next/server";
import { syncPendingRazorpayOrders } from "@/lib/sync-orders";
import { syncAllShippedOrders } from "@/lib/courier-tracking";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminSupabase();

    // 1. Permanently purge test order FLX-261024-277F15EE if present in DB
    const { data: testOrders } = await supabase
      .from("orders")
      .select("id")
      .or("order_number.eq.FLX-261024-277F15EE,id.eq.abadb627-06cb-474b-bef7-6a746d1309ce");

    let purgedCount = 0;
    if (testOrders && testOrders.length > 0) {
      for (const tOrd of testOrders) {
        await Promise.all([
          supabase.from("order_items").delete().eq("order_id", tOrd.id),
          supabase.from("seller_fulfillments").delete().eq("order_id", tOrd.id),
          supabase.from("return_requests").delete().eq("order_id", tOrd.id),
        ]);
        await supabase.from("orders").delete().eq("id", tOrd.id);
        purgedCount++;
      }
    }

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
      purgedTestOrders: purgedCount,
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
