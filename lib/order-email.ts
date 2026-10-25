import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mailer";
import { generateDefaultSku } from "@/lib/products";

type NotificationType = "order_confirmation" | "payment_review" | "shipment_update" | "delivered" | "refund_update";
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function sendOrderEmail(orderId: string, eventType: NotificationType) {
  const supabase = createAdminSupabase();
  const { error: claimError } = await supabase.from("order_notification_events").insert({ order_id: orderId, event_type: eventType });
  if (claimError?.code === "23505") return true;
  if (claimError) throw claimError;

  try {
    const [{ data: order, error: orderError }, { data: items, error: itemsError }] = await Promise.all([
      supabase.from("orders").select("order_number, customer_name, email, total_paise, shipping_address, tracking_carrier, tracking_number, tracking_url").eq("id", orderId).single(),
      supabase.from("order_items").select("product_name, size, quantity, line_total_paise").eq("order_id", orderId),
    ]);
    if (orderError) throw orderError;
    if (itemsError) throw itemsError;
    const safeName = escapeHtml(order.customer_name);
    const safeNumber = escapeHtml(order.order_number);
    const rows = (items ?? []).map((item, idx) => {
      const sku = generateDefaultSku(item.product_name, item.size, idx);
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #e8e0d3">${escapeHtml(item.product_name)} <span style="color:#81796e">· ${escapeHtml(item.size)} × ${item.quantity} · SKU: ${escapeHtml(sku)}</span></td><td style="padding:12px 0;border-bottom:1px solid #e8e0d3;text-align:right">₹${(item.line_total_paise / 100).toLocaleString("en-IN")}</td></tr>`;
    }).join("");
    const shippingAddr = (order.shipping_address as any) || {};
    const discountPaise = shippingAddr.discount_paise || 0;
    const couponCode = shippingAddr.coupon_code || null;
    const discountRow = discountPaise > 0 ? `<tr><td style="padding:12px 0;color:#53634b">Discount${couponCode ? ` · ${escapeHtml(couponCode)}` : ""}</td><td style="padding:12px 0;text-align:right;color:#53634b">−₹${(discountPaise / 100).toLocaleString("en-IN")}</td></tr>` : "";
    const carrierName = order.tracking_carrier || "Mahavir Express";
    const info = eventType === "shipment_update"
      ? `<p>Your luxury fragrance order has been packed and handed over to our courier partner <strong>${escapeHtml(carrierName)}</strong>.</p><p>Consignment / Tracking Number: <strong style="font-family:monospace;letter-spacing:1px;font-size:14px;color:#1f1a14">${escapeHtml(order.tracking_number)}</strong></p>${order.tracking_url ? `<p style="margin-top:16px"><a href="${escapeHtml(order.tracking_url)}" style="display:inline-block;padding:10px 18px;background:#aa8050;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;font-size:13px">Track on Mahavir Express ↗</a></p>` : ""}`
      : eventType === "delivered"
        ? `<p>Your Flovexa luxury fragrance parcel has been <strong>successfully delivered</strong> by ${escapeHtml(carrierName)}. We hope you love your new signature perfume flacon!</p><p>You can now log in to your Flovexa account anytime to view delivery confirmation and share your verified fragrance review.</p>`
        : eventType === "payment_review"
          ? "Your payment reached us. Our team is checking the order before confirming availability; we will update you shortly."
          : eventType === "refund_update"
            ? "A refund has been initiated for your order. Your payment provider will share the final settlement timeline."
            : `Thank you. Your payment is confirmed and an express parcel shipping label has been prepared for dispatch with <strong>${escapeHtml(carrierName)}</strong> (AWB: <strong>${escapeHtml(order.tracking_number || "Affixed on Handover")}</strong>). Your fragrance flacons are now being carefully packed in our signature velvet box for express delivery.`;
    const subject = eventType === "shipment_update" ? `Dispatched via ${carrierName} · Flovexa order ${order.order_number}` : eventType === "delivered" ? `Delivered · Your Flovexa perfume ${order.order_number} has arrived!` : eventType === "payment_review" ? `Payment received for ${order.order_number}` : eventType === "refund_update" ? `Refund update for ${order.order_number}` : `Order confirmed · ${order.order_number}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const html = `<div style="margin:0;padding:32px;background:#f5f2eb;font-family:Arial,sans-serif;color:#28231d"><div style="max-width:560px;margin:0 auto;padding:34px;background:#fffdf8"><p style="font:600 12px Arial;letter-spacing:4px">FLOVEXA PERFUMES</p><h1 style="font:400 32px Georgia,serif">${eventType === "shipment_update" ? "On its way." : eventType === "payment_review" ? "Payment received." : eventType === "refund_update" ? "Refund started." : "Thank you, " + safeName + "."}</h1><p style="line-height:1.7">${info}</p><p style="margin-top:22px;color:#81796e;font-size:12px">ORDER ${safeNumber}</p>${eventType === "order_confirmation" ? `<table style="width:100%;border-collapse:collapse;font-size:13px">${rows}${discountRow}<tr><td style="padding:14px 0">Order total</td><td style="padding:14px 0;text-align:right;font-weight:600">₹${(order.total_paise / 100).toLocaleString("en-IN")}</td></tr></table>` : ""}<p style="margin-top:28px;color:#81796e;font-size:12px">View your order <a href="${escapeHtml(siteUrl.replace(/\/$/, ""))}/orders">online</a>.</p><div style="margin-top:32px;padding-top:18px;border-top:1px solid #ebd9c8;font-size:11px;line-height:1.6;color:#8a7f72"><p style="margin:0 0 4px 0;font-weight:600;color:#28231d">FLOVEXA LUXURY PARFUMS</p><p style="margin:0 0 4px 0">21, Ramdev Row-House Shopping, Opp. Shivdhara Society, Rajmandir Road, Surat - 395011, Gujarat</p><p style="margin:0">Helpline: +91 96627 65757 · Email: flovexaenterprises@gmail.com</p></div></div></div>`;
    
    const sendResult = await sendMail({
      to: order.email,
      subject,
      html,
      text: `${subject}\n\n${String(info).replace(/<[^>]+>/g, " ")}\n\nOrder ${order.order_number}\n\n---\nFlovexa Luxury Parfums\n21, Ramdev Row-House Shopping, Opp. Shivdhara Society, Rajmandir Road, Surat - 395011\nHelpline: +91 96627 65757 | Email: flovexaenterprises@gmail.com`,
    });

    if (!sendResult.success) {
      console.warn("Order email not sent:", sendResult.error);
      return false;
    }

    const { error: markError } = await supabase.from("order_notification_events").update({ sent_at: new Date().toISOString() }).eq("order_id", orderId).eq("event_type", eventType);
    if (markError) throw markError;
    return true;
  } catch (error) {
    await supabase.from("order_notification_events").delete().eq("order_id", orderId).eq("event_type", eventType);
    throw error;
  }
}
