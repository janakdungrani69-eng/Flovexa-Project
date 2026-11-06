import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendOrderEmail } from "@/lib/order-email";

export const DEFAULT_COURIER = "Mahavir Express";
export const MAHAVIR_TRACKING_PORTAL = "https://shreemahavircourier.com/";

/**
 * Returns the customer-facing tracking URL for a given carrier & consignment number.
 */
export function buildTrackingUrl(carrier: string = DEFAULT_COURIER, trackingNumber?: string | null): string {
  const normCarrier = (carrier || "").toLowerCase();
  if (normCarrier.includes("mahavir") || normCarrier.includes("shree")) {
    // Official Shree Mahavir Courier tracking portal
    return MAHAVIR_TRACKING_PORTAL;
  }
  return MAHAVIR_TRACKING_PORTAL;
}

export type TrackingStatusResult = {
  carrier: string;
  trackingNumber: string;
  status: "shipped" | "in_transit" | "out_for_delivery" | "delivered";
  delivered: boolean;
  location?: string;
  lastUpdated: string;
  message: string;
};

/**
 * Checks the live tracking status for an order dispatched via Mahavir Express.
 */
export async function checkMahavirTrackingStatus(
  trackingNumber: string
): Promise<TrackingStatusResult> {
  const cleanNumber = (trackingNumber || "").trim().toUpperCase();
  const now = new Date().toISOString();

  if (!cleanNumber) {
    return {
      carrier: DEFAULT_COURIER,
      trackingNumber: "",
      status: "shipped",
      delivered: false,
      lastUpdated: now,
      message: "No tracking number registered yet.",
    };
  }

  // Check official live tracking endpoint on Shree Mahavir Courier
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const getRes = await fetch("https://shreemahavircourier.com/", {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }).catch(() => null);

    if (getRes && getRes.ok) {
      const getHtml = await getRes.text();
      const vsMatch = getHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/i);
      const evMatch = getHtml.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/i);
      const genMatch = getHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/i);

      if (vsMatch) {
        const formData = new URLSearchParams();
        formData.append("__VIEWSTATE", vsMatch[1]);
        if (evMatch) formData.append("__EVENTVALIDATION", evMatch[1]);
        if (genMatch) formData.append("__VIEWSTATEGENERATOR", genMatch[1]);
        formData.append("txtAWBNo", cleanNumber);
        formData.append("cmdTrack", "Tracking");

        const postRes = await fetch("https://shreemahavircourier.com/Index.aspx", {
          method: "POST",
          body: formData.toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeout);

        if (postRes && postRes.ok) {
          const resHtml = await postRes.text();
          const lower = resHtml.toLowerCase();

          // Check if Mahavir courier confirmed delivery
          const isDelivered =
            lower.includes("delivered to") ||
            lower.includes("status: delivered") ||
            lower.includes("delivery date") ||
            (lower.includes("delivered") && !lower.includes("not delivered") && !lower.includes("undelivered"));

          const isOutForDelivery = lower.includes("out for delivery");

          if (isDelivered) {
            return {
              carrier: DEFAULT_COURIER,
              trackingNumber: cleanNumber,
              status: "delivered",
              delivered: true,
              location: "Delivered to Customer by Mahavir Express",
              lastUpdated: now,
              message: "Parcel successfully delivered to consignee address.",
            };
          }

          if (isOutForDelivery) {
            return {
              carrier: DEFAULT_COURIER,
              trackingNumber: cleanNumber,
              status: "out_for_delivery",
              delivered: false,
              location: "Out for Delivery via Mahavir Express",
              lastUpdated: now,
              message: "Parcel is out for delivery with local courier executive.",
            };
          }
        }
      }
    }

    clearTimeout(timeout);
  } catch (err) {
    console.warn("Mahavir live tracking check notice:", err);
  }

  return {
    carrier: DEFAULT_COURIER,
    trackingNumber: cleanNumber,
    status: "in_transit",
    delivered: false,
    location: "In Transit via Mahavir Express Hub",
    lastUpdated: now,
    message: "Handed over to Mahavir Express courier partner.",
  };
}

/**
 * Syncs the order tracking status and automatically transitions to 'delivered'
 * when Mahavir Express marks the parcel delivered.
 */
export async function syncOrderDeliveryStatus(orderId: string, forceMarkDelivered = false) {
  const supabase = createAdminSupabase();

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, status, tracking_carrier, tracking_number, tracking_url, customer_name, email")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return { success: false, error: "Order not found" };
  }

  if (order.status === "delivered") {
    return { success: true, status: "delivered", alreadyDelivered: true };
  }

  if (order.status !== "shipped" && !forceMarkDelivered) {
    return { success: true, status: order.status, message: "Order not yet in transit" };
  }

  let isDelivered = forceMarkDelivered;

  if (!isDelivered && order.tracking_number) {
    const tracking = await checkMahavirTrackingStatus(order.tracking_number);
    isDelivered = tracking.delivered;
  }

  if (isDelivered) {
    const nowIso = new Date().toISOString();

    // 1. Update public.orders
    await supabase
      .from("orders")
      .update({
        status: "delivered",
        updated_at: nowIso,
      })
      .eq("id", orderId);

    // 2. Update seller_fulfillments
    await supabase
      .from("seller_fulfillments")
      .update({
        status: "delivered",
        updated_at: nowIso,
      })
      .eq("order_id", orderId);

    // 3. Send delivered notification email
    try {
      await sendOrderEmail(orderId, "delivered");
    } catch (emailErr) {
      console.warn("Delivery email failed/deferred:", emailErr);
    }

    return {
      success: true,
      status: "delivered",
      updated: true,
      orderNumber: order.order_number,
      carrier: order.tracking_carrier || DEFAULT_COURIER,
      trackingNumber: order.tracking_number,
    };
  }

  return {
    success: true,
    status: order.status,
    updated: false,
    orderNumber: order.order_number,
    carrier: order.tracking_carrier || DEFAULT_COURIER,
    trackingNumber: order.tracking_number,
  };
}

/**
 * Periodically checks all shipped orders with Mahavir Courier
 * and auto-updates them to 'delivered' when destination delivery is confirmed.
 */
export async function syncAllShippedOrders(): Promise<{ checked: number; deliveredCount: number }> {
  try {
    const supabase = createAdminSupabase();
    const { data: shippedOrders, error } = await supabase
      .from("orders")
      .select("id, order_number, status, tracking_carrier, tracking_number")
      .eq("status", "shipped")
      .not("tracking_number", "is", null)
      .limit(25);

    if (error || !shippedOrders || shippedOrders.length === 0) {
      return { checked: 0, deliveredCount: 0 };
    }

    let deliveredCount = 0;
    for (const order of shippedOrders) {
      if (!order.tracking_number) continue;
      const res = await syncOrderDeliveryStatus(order.id);
      if (res.success && res.status === "delivered" && res.updated) {
        deliveredCount++;
      }
    }

    return { checked: shippedOrders.length, deliveredCount };
  } catch (err) {
    console.error("syncAllShippedOrders error:", err);
    return { checked: 0, deliveredCount: 0 };
  }
}

