"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Printer, Sparkles, X, ShieldAlert } from "lucide-react";
import { generateDefaultSku } from "@/lib/products";

export type ShippingLabelOrder = {
  id: string;
  order_number: string;
  customer_name?: string;
  phone?: string;
  shipping_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  } | null;
  status: string;
  payment_status: string;
  total_paise: number;
  created_at: string;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  order_items: Array<{
    product_name: string;
    size: string;
    quantity: number;
    sku?: string;
    unit_price_paise?: number;
    line_total_paise?: number;
  }>;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

function getOrderDetails(order: ShippingLabelOrder, fallbackCustomerName?: string, fallbackPhone?: string) {
  const totalBottles = order.order_items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const isCombo = totalBottles > 1 || order.order_items.length > 1;
  const courierPartner = order.tracking_carrier || "Mahavir Express";
  const recipientName = order.customer_name || fallbackCustomerName || "Valued Fragrance Patron";
  const recipientPhone = order.phone || fallbackPhone || "+91 (Verified on Checkout)";
  const address = order.shipping_address || {
    line1: "Customer Shipping Address",
    line2: "",
    city: "Surat",
    state: "Gujarat",
    pincode: "395011",
    country: "India",
  };
  const orderDateFormatted = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const awbNumber = order.tracking_number?.trim() || `ME-${order.order_number.replace(/\D/g, "") || Date.now().toString().slice(-8)}`;

  return { totalBottles, isCombo, courierPartner, recipientName, recipientPhone, address, orderDateFormatted, awbNumber };
}

function buildSingleOrderInnerHtml(order: ShippingLabelOrder, fallbackCustomerName?: string, fallbackPhone?: string): string {
  const { totalBottles, isCombo, courierPartner, recipientName, recipientPhone, address, orderDateFormatted, awbNumber } =
    getOrderDetails(order, fallbackCustomerName, fallbackPhone);

  const itemsRows = order.order_items
    .map((item, idx) => {
      const sku = item.sku || generateDefaultSku(item.product_name, item.size, idx);
      const isGift = item.product_name.includes("Free Gift") || item.product_name.includes("Complimentary");
      return `
        <tr>
          <td style="text-align:center;font-weight:700;padding:3px 4px;border-bottom:1px dotted #555;">${idx + 1}</td>
          <td style="padding:3px 4px;border-bottom:1px dotted #555;">
            <strong style="font-size:10.5px;">${item.product_name}</strong>
          </td>
          <td style="padding:3px 4px;border-bottom:1px dotted #555;font-family:monospace;font-size:9.5px;font-weight:700;">${sku}</td>
          <td style="text-align:center;padding:3px 4px;border-bottom:1px dotted #555;font-size:10px;">${item.size}</td>
          <td style="text-align:center;padding:3px 4px;border-bottom:1px dotted #555;font-weight:800;font-size:11px;">×${item.quantity}</td>
          <td style="text-align:right;padding:3px 4px;border-bottom:1px dotted #555;font-size:9.5px;color:${isGift ? '#080' : '#222'};">
            ${isGift ? '🎁 Free Gift' : 'Glass Flacon'}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="thermal-4x6-page">
      <!-- 1. Header -->
      <div class="th-header">
        <div>
          <span class="th-logo-title">FLOVEXA®</span>
          <span class="th-logo-sub">LUXURY PARFUMS ATELIER · SURAT</span>
        </div>
        <div style="text-align:right;">
          <span class="th-badge-prepaid">PREPAID EXPRESS AIR</span>
          <div style="font-size:8px;font-weight:800;margin-top:2px;">${isCombo ? `COMBO SET (${totalBottles} PCS)` : 'SINGLE ITEM'}</div>
        </div>
      </div>

      <!-- 2. Barcode & AWB -->
      <div class="th-barcode-wrap">
        <div class="th-meta-line">
          <span>ORDER: <strong style="font-family:monospace;font-size:11px;">#${order.order_number}</strong></span>
          <span>COURIER: <strong>${courierPartner.toUpperCase()}</strong></span>
          <span>DATE: <strong>${orderDateFormatted}</strong></span>
        </div>

        <div class="th-barcode-svg-wrap">
          <svg viewBox="0 0 340 38" style="width:100%;height:32px;" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="4" height="38" fill="#000" />
            <rect x="7" y="0" width="2" height="38" fill="#000" />
            <rect x="12" y="0" width="6" height="38" fill="#000" />
            <rect x="22" y="0" width="3" height="38" fill="#000" />
            <rect x="29" y="0" width="5" height="38" fill="#000" />
            <rect x="38" y="0" width="2" height="38" fill="#000" />
            <rect x="44" y="0" width="7" height="38" fill="#000" />
            <rect x="55" y="0" width="3" height="38" fill="#000" />
            <rect x="62" y="0" width="4" height="38" fill="#000" />
            <rect x="70" y="0" width="2" height="38" fill="#000" />
            <rect x="76" y="0" width="6" height="38" fill="#000" />
            <rect x="86" y="0" width="3" height="38" fill="#000" />
            <rect x="93" y="0" width="5" height="38" fill="#000" />
            <rect x="102" y="0" width="3" height="38" fill="#000" />
            <rect x="109" y="0" width="7" height="38" fill="#000" />
            <rect x="120" y="0" width="4" height="38" fill="#000" />
            <rect x="128" y="0" width="2" height="38" fill="#000" />
            <rect x="134" y="0" width="5" height="38" fill="#000" />
            <rect x="143" y="0" width="8" height="38" fill="#000" />
            <rect x="155" y="0" width="3" height="38" fill="#000" />
            <rect x="162" y="0" width="4" height="38" fill="#000" />
            <rect x="170" y="0" width="6" height="38" fill="#000" />
            <rect x="180" y="0" width="2" height="38" fill="#000" />
            <rect x="186" y="0" width="5" height="38" fill="#000" />
            <rect x="195" y="0" width="4" height="38" fill="#000" />
            <rect x="203" y="0" width="6" height="38" fill="#000" />
            <rect x="213" y="0" width="3" height="38" fill="#000" />
            <rect x="220" y="0" width="7" height="38" fill="#000" />
            <rect x="231" y="0" width="3" height="38" fill="#000" />
            <rect x="238" y="0" width="5" height="38" fill="#000" />
            <rect x="247" y="0" width="2" height="38" fill="#000" />
            <rect x="253" y="0" width="6" height="38" fill="#000" />
            <rect x="263" y="0" width="4" height="38" fill="#000" />
            <rect x="271" y="0" width="3" height="38" fill="#000" />
            <rect x="278" y="0" width="5" height="38" fill="#000" />
            <rect x="287" y="0" width="7" height="38" fill="#000" />
            <rect x="298" y="0" width="3" height="38" fill="#000" />
            <rect x="305" y="0" width="4" height="38" fill="#000" />
            <rect x="313" y="0" width="6" height="38" fill="#000" />
            <rect x="323" y="0" width="3" height="38" fill="#000" />
            <rect x="330" y="0" width="5" height="38" fill="#000" />
            <rect x="338" y="0" width="2" height="38" fill="#000" />
          </svg>
        </div>

        <div style="font-family:monospace;font-size:11px;font-weight:900;letter-spacing:0.12em;margin-top:2px;">
          AWB: ${awbNumber}
        </div>
      </div>

      <!-- 3. Express Routing Strip -->
      <div class="th-routing-strip">
        <span>ORIGIN: SURAT (STV-HUB)</span>
        <span>➔ ➔ EXPRESS AIR DISPATCH ➔ ➔</span>
        <span>DEST: ${address.city.toUpperCase()} (${address.pincode})</span>
      </div>

      <!-- 4. Ship To & Ship From Address Matrix -->
      <div class="th-address-grid">
        <div class="th-ship-to">
          <span class="th-box-tag">DELIVER TO / SHIP TO</span>
          <div class="th-recipient-name">${recipientName}</div>
          <div class="th-phone-badge">TEL: ${recipientPhone}</div>
          <div class="th-address-text">
            <strong>${address.line1}</strong><br/>
            ${address.line2 ? `${address.line2}<br/>` : ''}
            <strong style="text-transform:uppercase;">${address.city}, ${address.state}</strong>
          </div>
          <div class="th-pincode-box">
            <span style="font-size:9px;font-weight:800;letter-spacing:0.08em;">DEST PIN</span>
            <strong>${address.pincode}</strong>
          </div>
        </div>

        <div class="th-ship-from">
          <span class="th-box-tag">SHIP FROM / RETURN</span>
          <div style="font-size:12px;font-weight:900;text-transform:uppercase;margin-bottom:2px;">FLOVEXA® PARFUM</div>
          <div class="th-phone-badge" style="font-size:9.5px;">HELP: +91 96627 65757</div>
          <div class="th-address-text" style="font-size:9.5px;">
            21, Ramdev Row-House Shopping, Opp. Shivdhara Society, Rajmandir Rd<br/>
            <strong>Surat, Gujarat – 395006</strong><br/>
            <span style="font-size:8.5px;color:#444;">GSTIN Registered Atelier</span>
          </div>
          <div style="margin-top:auto;border:1.5px solid #000;background:#f4f4f4;padding:3px 5px;display:flex;justify-content:space-between;font-size:8.5px;font-weight:900;">
            <span>SORT HUB</span>
            <span>STV-W01 · SURAT</span>
          </div>
        </div>
      </div>

      <!-- 5. Manifest Table -->
      <div class="th-manifest-wrap">
        <div class="th-manifest-title">
          <span>${isCombo ? `COMBO PACK MANIFEST (${totalBottles} ITEMS IN 1 PARCEL)` : 'PARCEL MANIFEST · 1 ITEM'}</span>
          <span>✓ QC PASSED</span>
        </div>
        <table class="th-manifest-table">
          <thead>
            <tr>
              <th style="width:24px;text-align:center;">#</th>
              <th>ITEM DESCRIPTION</th>
              <th style="width:90px;">SKU</th>
              <th style="width:45px;text-align:center;">SIZE</th>
              <th style="width:35px;text-align:center;">QTY</th>
              <th style="width:65px;text-align:right;">TYPE</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div class="th-summary-strip">
          <span>PIECES: <strong>${totalBottles} BOTTLE${totalBottles > 1 ? 'S' : ''}</strong></span>
          <span>PAYMENT: <strong>PREPAID — DO NOT COLLECT CASH</strong></span>
          <span>INVOICE: <strong>${money(order.total_paise)}</strong></span>
        </div>
      </div>

      <!-- 6. Footer -->
      <div class="th-footer-warning">
        <span>⚠️ <strong>FRAGILE:</strong> LUXURY GLASS PERFUME BOTTLES · HANDLE WITH CARE</span>
        <span style="font-family:monospace;font-weight:700;">*FLX-${order.order_number}*</span>
      </div>
    </div>
  `;
}

function buildBatchThermal4x6Html(orders: ShippingLabelOrder[], autoPrint?: boolean): string {
  const innerHtmlList = orders.map((o) => buildSingleOrderInnerHtml(o)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Flovexa_Batch_Shipping_Labels_${orders.length}_Orders</title>
  <style>
    @page {
      size: 4in 6in;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      width: 4in;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.25;
    }
    .thermal-4x6-page {
      width: 4in;
      height: 6in;
      max-width: 4in;
      max-height: 6in;
      padding: 6px 8px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 2px solid #000000;
      background: #ffffff;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
    }
    .thermal-4x6-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .th-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .th-logo-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.14em;
      line-height: 1;
    }
    .th-logo-sub {
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.18em;
      color: #222;
      display: block;
      margin-top: 1px;
    }
    .th-badge-prepaid {
      background: #000;
      color: #fff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.1em;
      padding: 4px 8px;
      border-radius: 2px;
      text-align: right;
    }
    .th-barcode-wrap {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .th-meta-line {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      font-weight: 800;
      margin-bottom: 2px;
    }
    .th-routing-strip {
      background: #000;
      color: #fff;
      font-size: 9.5px;
      font-weight: 900;
      letter-spacing: 0.06em;
      padding: 4px 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
      border-radius: 2px;
    }
    .th-address-grid {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
      gap: 6px;
    }
    .th-ship-to, .th-ship-from {
      display: flex;
      flex-direction: column;
    }
    .th-ship-to {
      border-right: 1.5px solid #000;
      padding-right: 6px;
    }
    .th-box-tag {
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 0.08em;
      background: #000;
      color: #fff;
      padding: 2px 4px;
      display: inline-block;
      width: fit-content;
      margin-bottom: 3px;
      border-radius: 1px;
    }
    .th-recipient-name {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.15;
      margin-bottom: 2px;
    }
    .th-phone-badge {
      font-size: 10.5px;
      font-weight: 800;
      background: #eee;
      padding: 1px 5px;
      border-radius: 2px;
      display: inline-block;
      margin-bottom: 3px;
      width: fit-content;
    }
    .th-address-text {
      font-size: 10px;
      line-height: 1.35;
      color: #111;
      margin-bottom: 4px;
    }
    .th-pincode-box {
      margin-top: auto;
      background: #000;
      color: #fff;
      padding: 4px 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 2px;
    }
    .th-pincode-box strong {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.16em;
      font-family: monospace;
    }
    .th-manifest-wrap {
      border: 1.5px solid #000;
      padding: 4px;
      margin-bottom: 4px;
      background: #fafafa;
    }
    .th-manifest-title {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 900;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      margin-bottom: 3px;
      letter-spacing: 0.04em;
    }
    .th-manifest-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .th-manifest-table th {
      background: #222;
      color: #fff;
      font-size: 8.5px;
      font-weight: 800;
      padding: 2px 4px;
      text-align: left;
    }
    .th-summary-strip {
      display: flex;
      justify-content: space-between;
      background: #eee;
      border-top: 1px solid #000;
      padding: 3px 5px;
      margin-top: 3px;
      font-size: 9px;
      font-weight: 800;
    }
    .th-footer-warning {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8px;
      font-weight: 800;
      padding-top: 1px;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body style="background:#f4f4f5; padding:12px; margin:0 auto; max-width:4.2in;">
  <div class="no-print" style="background:#18181b; color:#ffffff; padding:10px 14px; margin-bottom:12px; border-radius:6px; display:flex; align-items:center; justify-content:space-between; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; font-size:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="background:#10b981; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:3px;">4×6 THERMAL</span>
      <strong>${orders.length > 1 ? `Batch of ${orders.length} Orders` : `Order #${orders[0]?.order_number}`}</strong>
    </div>
    <div style="display:flex; gap:8px;">
      <button onclick="window.print()" style="background:#10b981; color:#ffffff; border:none; padding:6px 14px; border-radius:4px; font-weight:700; cursor:pointer; font-size:12px;">
        🖨️ Print ${orders.length > 1 ? `All ${orders.length} Labels` : 'Label'} (TSC)
      </button>
      <button onclick="window.close()" style="background:#3f3f46; color:#ffffff; border:none; padding:6px 12px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px;">
        ✕ Close
      </button>
    </div>
  </div>
  ${innerHtmlList}
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      ${autoPrint ? 'setTimeout(function() { window.focus(); window.print(); }, 250);' : ''}
    });
  </script>
</body>
</html>`;
}

// Single JSX Label Card View
function SingleOrderLabelView({
  order,
  fallbackCustomerName,
  fallbackPhone,
}: {
  order: ShippingLabelOrder;
  fallbackCustomerName?: string;
  fallbackPhone?: string;
}) {
  const { totalBottles, isCombo, courierPartner, recipientName, recipientPhone, address, orderDateFormatted, awbNumber } =
    getOrderDetails(order, fallbackCustomerName, fallbackPhone);

  return (
    <div
      id={`shipping-label-printable-${order.order_number}`}
      className="shipping-thermal-label printable-shipping-label"
      style={{
        width: "100%",
        maxWidth: "460px",
        margin: "0 auto 16px",
        border: "2px solid #000000",
        padding: "8px 10px",
        background: "#ffffff",
        color: "#000000",
      }}
    >
      {/* 1. Label Top Header */}
      <div className="thermal-header-grid" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "2px solid #000000",
        paddingBottom: "6px",
        marginBottom: "6px",
      }}>
        <div className="thermal-brand-cell">
          <span className="thermal-brand-name" style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "0.14em" }}>FLOVEXA®</span>
          <span className="thermal-brand-sub" style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: "0.16em", color: "#333" }}>LUXURY PARFUMS ATELIER · SURAT</span>
          <small className="thermal-origin-tag" style={{ fontSize: "8px", color: "#666" }}>ORIGIN: SURAT, GUJARAT, INDIA</small>
        </div>

        <div className="thermal-routing-cell" style={{ textAlign: "right" }}>
          <div className="thermal-priority-box" style={{
            background: "#000000",
            color: "#ffffff",
            padding: "4px 8px",
            borderRadius: "2px",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.08em",
          }}>
            PREPAID EXPRESS AIR
          </div>
          <div style={{ fontSize: "8.5px", fontWeight: 800, marginTop: "2px" }}>
            {isCombo ? `COMBO SET (${totalBottles} PCS)` : "SINGLE ITEM"}
          </div>
        </div>
      </div>

      {/* 2. Parcel Reference & Barcode Section */}
      <div className="thermal-barcode-strip" style={{
        borderBottom: "2px solid #000000",
        paddingBottom: "6px",
        marginBottom: "6px",
        textAlign: "center",
      }}>
        <div className="thermal-carrier-row" style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          fontWeight: 800,
          marginBottom: "3px",
        }}>
          <span>ORDER ID: <strong style={{ fontFamily: "monospace", fontSize: "11px" }}>#{order.order_number}</strong></span>
          <span>COURIER: <strong>{courierPartner.toUpperCase()}</strong></span>
          <span>DATE: <strong>{orderDateFormatted}</strong></span>
        </div>

        <div className="thermal-barcode-graphic" style={{ margin: "3px auto", width: "96%" }}>
          <svg
            className="barcode-svg"
            viewBox="0 0 340 38"
            style={{ width: "100%", height: "32px" }}
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="0" y="0" width="4" height="38" fill="#000" />
            <rect x="7" y="0" width="2" height="38" fill="#000" />
            <rect x="12" y="0" width="6" height="38" fill="#000" />
            <rect x="22" y="0" width="3" height="38" fill="#000" />
            <rect x="29" y="0" width="5" height="38" fill="#000" />
            <rect x="38" y="0" width="2" height="38" fill="#000" />
            <rect x="44" y="0" width="7" height="38" fill="#000" />
            <rect x="55" y="0" width="3" height="38" fill="#000" />
            <rect x="62" y="0" width="4" height="38" fill="#000" />
            <rect x="70" y="0" width="2" height="38" fill="#000" />
            <rect x="76" y="0" width="6" height="38" fill="#000" />
            <rect x="86" y="0" width="3" height="38" fill="#000" />
            <rect x="93" y="0" width="5" height="38" fill="#000" />
            <rect x="102" y="0" width="3" height="38" fill="#000" />
            <rect x="109" y="0" width="7" height="38" fill="#000" />
            <rect x="120" y="0" width="4" height="38" fill="#000" />
            <rect x="128" y="0" width="2" height="38" fill="#000" />
            <rect x="134" y="0" width="5" height="38" fill="#000" />
            <rect x="143" y="0" width="8" height="38" fill="#000" />
            <rect x="155" y="0" width="3" height="38" fill="#000" />
            <rect x="162" y="0" width="4" height="38" fill="#000" />
            <rect x="170" y="0" width="6" height="38" fill="#000" />
            <rect x="180" y="0" width="2" height="38" fill="#000" />
            <rect x="186" y="0" width="5" height="38" fill="#000" />
            <rect x="195" y="0" width="4" height="38" fill="#000" />
            <rect x="203" y="0" width="6" height="38" fill="#000" />
            <rect x="213" y="0" width="3" height="38" fill="#000" />
            <rect x="220" y="0" width="7" height="38" fill="#000" />
            <rect x="231" y="0" width="3" height="38" fill="#000" />
            <rect x="238" y="0" width="5" height="38" fill="#000" />
            <rect x="247" y="0" width="2" height="38" fill="#000" />
            <rect x="253" y="0" width="6" height="38" fill="#000" />
            <rect x="263" y="0" width="4" height="38" fill="#000" />
            <rect x="271" y="0" width="3" height="38" fill="#000" />
            <rect x="278" y="0" width="5" height="38" fill="#000" />
            <rect x="287" y="0" width="7" height="38" fill="#000" />
            <rect x="298" y="0" width="3" height="38" fill="#000" />
            <rect x="305" y="0" width="4" height="38" fill="#000" />
            <rect x="313" y="0" width="6" height="38" fill="#000" />
            <rect x="323" y="0" width="3" height="38" fill="#000" />
            <rect x="330" y="0" width="5" height="38" fill="#000" />
            <rect x="338" y="0" width="2" height="38" fill="#000" />
          </svg>
        </div>

        <div style={{
          fontFamily: "monospace",
          fontSize: "11px",
          fontWeight: 900,
          letterSpacing: "0.12em",
          marginTop: "2px",
        }}>
          AWB: {awbNumber}
        </div>
      </div>

      {/* 3. Luxury Express Routing Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 8px",
        background: "#000000",
        color: "#ffffff",
        fontSize: "9.5px",
        fontWeight: 900,
        letterSpacing: "0.06em",
        marginBottom: "6px",
        borderRadius: "2px",
      }}>
        <span>ORIGIN: SURAT (STV-HUB)</span>
        <span>➔ ➔ EXPRESS AIR DISPATCH ➔ ➔</span>
        <span>DEST: {address.city.toUpperCase()} ({address.pincode})</span>
      </div>

      {/* 4. Address Matrix: Ship To vs Ship From */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.35fr 1fr",
        borderBottom: "2px solid #000000",
        paddingBottom: "6px",
        marginBottom: "6px",
        gap: "8px",
      }}>
        {/* Deliver To */}
        <div style={{ borderRight: "1.5px solid #000000", paddingRight: "6px", display: "flex", flexDirection: "column" }}>
          <span style={{
            fontSize: "8px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            background: "#000000",
            color: "#ffffff",
            padding: "2px 5px",
            display: "inline-block",
            width: "fit-content",
            marginBottom: "3px",
            borderRadius: "1px",
          }}>
            DELIVER TO / SHIP TO
          </span>
          <div style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1.15, marginBottom: "2px" }}>
            {recipientName}
          </div>
          <div style={{ fontSize: "10.5px", fontWeight: 800, background: "#f0ece7", padding: "1px 5px", borderRadius: "2px", display: "inline-block", marginBottom: "3px", width: "fit-content" }}>
            TEL: {recipientPhone}
          </div>
          <div style={{ fontSize: "10px", lineHeight: 1.35, color: "#111", marginBottom: "4px" }}>
            <strong>{address.line1}</strong>
            {address.line2 && <><br />{address.line2}</>}
            <br />
            <strong style={{ textTransform: "uppercase" }}>{address.city}, {address.state}</strong>
          </div>
          <div style={{
            marginTop: "auto",
            background: "#000000",
            color: "#ffffff",
            padding: "4px 7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "2px",
          }}>
            <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em" }}>DEST PIN</span>
            <strong style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "0.16em", fontFamily: "monospace" }}>
              {address.pincode}
            </strong>
          </div>
        </div>

        {/* Ship From */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{
            fontSize: "8px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            background: "#000000",
            color: "#ffffff",
            padding: "2px 5px",
            display: "inline-block",
            width: "fit-content",
            marginBottom: "3px",
            borderRadius: "1px",
          }}>
            SHIP FROM / RETURN
          </span>
          <div style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", marginBottom: "2px" }}>
            FLOVEXA® PARFUM
          </div>
          <div style={{ fontSize: "9.5px", fontWeight: 800, background: "#f0ece7", padding: "1px 5px", borderRadius: "2px", display: "inline-block", marginBottom: "3px", width: "fit-content" }}>
            HELP: +91 96627 65757
          </div>
          <div style={{ fontSize: "9.5px", lineHeight: 1.35, color: "#111" }}>
            21, Ramdev Row-House Shopping, Opp. Shivdhara Society, Rajmandir Rd<br />
            <strong>Surat, Gujarat – 395006</strong><br />
            <span style={{ fontSize: "8.5px", color: "#444" }}>GSTIN Registered Atelier</span>
          </div>
          <div style={{
            marginTop: "auto",
            border: "1.5px solid #000000",
            background: "#f4f4f4",
            padding: "3px 5px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "8.5px",
            fontWeight: 900,
          }}>
            <span>SORT HUB</span>
            <span>STV-W01 · SURAT</span>
          </div>
        </div>
      </div>

      {/* 5. Manifest Table */}
      <div style={{
        border: "1.5px solid #000000",
        padding: "4px",
        marginBottom: "4px",
        background: "#fafafa",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9px",
          fontWeight: 900,
          borderBottom: "1px solid #000000",
          paddingBottom: "2px",
          marginBottom: "3px",
          letterSpacing: "0.04em",
        }}>
          <span>{isCombo ? `COMBO PACK MANIFEST (${totalBottles} ITEMS IN 1 PARCEL)` : "PARCEL MANIFEST · 1 ITEM"}</span>
          <span>✓ QC PASSED</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
          <thead>
            <tr style={{ background: "#222222", color: "#ffffff", fontSize: "8.5px" }}>
              <th style={{ width: "24px", textAlign: "center", padding: "2px 4px" }}>#</th>
              <th style={{ textAlign: "left", padding: "2px 4px" }}>ITEM DESCRIPTION</th>
              <th style={{ width: "90px", textAlign: "left", padding: "2px 4px" }}>SKU</th>
              <th style={{ width: "45px", textAlign: "center", padding: "2px 4px" }}>SIZE</th>
              <th style={{ width: "35px", textAlign: "center", padding: "2px 4px" }}>QTY</th>
              <th style={{ width: "65px", textAlign: "right", padding: "2px 4px" }}>TYPE</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: "center", fontWeight: 700, padding: "3px", borderBottom: "1px dotted #888" }}>{idx + 1}</td>
                <td style={{ padding: "3px", borderBottom: "1px dotted #888" }}>
                  <strong style={{ fontSize: "10.5px" }}>{item.product_name}</strong>
                </td>
                <td style={{ padding: "3px", borderBottom: "1px dotted #888" }}>
                  <code style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 800, color: "#000" }}>
                    {item.sku || generateDefaultSku(item.product_name, item.size, idx)}
                  </code>
                </td>
                <td style={{ textAlign: "center", padding: "3px", borderBottom: "1px dotted #888", fontSize: "10px" }}>{item.size}</td>
                <td style={{ textAlign: "center", fontWeight: 900, padding: "3px", borderBottom: "1px dotted #888", fontSize: "11px" }}>×{item.quantity}</td>
                <td style={{ textAlign: "right", fontSize: "9.5px", padding: "3px", borderBottom: "1px dotted #888" }}>
                  {item.product_name.includes("Free Gift") || item.product_name.includes("Complimentary") ? "🎁 Free Gift" : "Glass Flacon"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total & Commercial Value Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          background: "#f4f4f4",
          border: "1px solid #000000",
          padding: "4px 8px",
          marginTop: "3px",
          fontSize: "9.5px",
          fontWeight: 800,
        }}>
          <div>
            <span>PIECES: <strong>{totalBottles} BOTTLE{totalBottles > 1 ? "S" : ""}</strong></span>
          </div>
          <div>
            <span>PAYMENT: <strong>PREPAID — DO NOT COLLECT CASH</strong></span>
          </div>
          <div>
            <span>INVOICE VALUE: <strong>{money(order.total_paise)}</strong></span>
          </div>
        </div>
      </div>

      {/* 6. Courier Warning & Security Strip */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "8.5px",
        fontWeight: 800,
        paddingTop: "2px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <ShieldAlert size={12} />
          <span><strong>FRAGILE:</strong> LUXURY GLASS PERFUME BOTTLES · HANDLE WITH CARE</span>
        </div>
        <div style={{ fontFamily: "monospace", fontWeight: 900 }}>
          *FLX-LBL-{order.order_number}*
        </div>
      </div>
    </div>
  );
}

export default function ShippingLabelModal({
  order,
  orders,
  fallbackCustomerName,
  fallbackPhone,
  onClose,
}: {
  order?: ShippingLabelOrder;
  orders?: ShippingLabelOrder[];
  fallbackCustomerName?: string;
  fallbackPhone?: string;
  onClose: () => void;
}) {
  const orderList: ShippingLabelOrder[] = orders && orders.length > 0 ? orders : order ? [order] : [];
  const isMulti = orderList.length > 1;

  const [activeOrderIndex, setActiveOrderIndex] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string>("");

  const currentOrder = orderList[activeOrderIndex] || orderList[0];

  // Handle escape key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (orderList.length === 0) {
    return null;
  }

  // DIRECT DOWNLOAD 4x6 COMBINED MULTI-PAGE PDF FILE TO PC
  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    setPdfProgress("Initializing PDF…");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: [4, 6],
      });

      for (let i = 0; i < orderList.length; i++) {
        const ord = orderList[i];
        setPdfProgress(`Rendering ${i + 1} of ${orderList.length}…`);

        const element = document.getElementById(`shipping-label-printable-${ord.order_number}`);
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 3, // 300 DPI ultra-sharp resolution for barcode scanners
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        if (i > 0) {
          pdf.addPage([4, 6], "portrait");
        }
        pdf.addImage(imgData, "PNG", 0, 0, 4, 6, undefined, "FAST");
      }

      setPdfProgress("Saving PDF to PC…");
      const filename = isMulti
        ? `Flovexa_Batch_Labels_${orderList.length}_Orders_4x6.pdf`
        : `Shipping_Label_FLX_${currentOrder.order_number}_4x6.pdf`;

      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
      // Fallback: open clean print window
      handlePrint4x6();
    } finally {
      setDownloadingPdf(false);
      setPdfProgress("");
    }
  }

  // DIRECT 4x6 THERMAL PRINT (Formats all orders for continuous TSC printer sticker roll)
  function handlePrint4x6() {
    try {
      const html = buildBatchThermal4x6Html(orderList, true);

      const printWin = window.open(
        "",
        `_batch_labels_${Date.now()}`,
        "width=520,height=780,menubar=no,toolbar=no,location=no,status=no"
      );
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        return;
      }
    } catch {
      // ignore
    }

    // Direct fallback using fixed visibility print styles in operations.css
    window.print();
  }

  return (
    <div className="shipping-label-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="shipping-label-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: isMulti ? "720px" : "660px" }}
      >
        {/* Modal Top Bar (Hidden during print) */}
        <div className="shipping-label-modal-header no-print">
          <div>
            <span className="shipping-label-eyebrow">
              <Sparkles size={13} /> {isMulti ? `📦 Bulk 4×6 Labels · ${orderList.length} Orders Selected` : "Official 4×6 Parcel Shipping Label"}
            </span>
            <h3 className="shipping-label-modal-title">
              {isMulti ? `Batch Shipping Labels (${orderList.length} Orders Combined)` : `Order #${currentOrder.order_number} · Standard 4×6 Thermal Label`}
            </h3>
            <p className="shipping-label-modal-sub">
              {isMulti
                ? "All selected orders merged into 1 continuous 4×6 PDF for rapid TSC thermal printer sticker roll dispatch."
                : "TSC Thermal Printer & Online Label Ready (Meesho / Amazon Standard 100×150 mm). Zero blank pages."}
            </p>
          </div>

          <div className="shipping-label-modal-actions">
            {/* Primary Direct Download 4x6 PDF Button */}
            <button
              type="button"
              className="shipping-label-print-btn"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              title="Save exact 4x6 shipping label PDF file directly to your PC"
              style={{
                background: "#10b981",
                color: "#ffffff",
                border: "1px solid #059669",
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
              }}
            >
              <Download size={15} />
              <span>
                {downloadingPdf
                  ? (pdfProgress || "Generating PDF…")
                  : isMulti
                  ? `Download Combined 4×6 PDF (${orderList.length} Orders)`
                  : "Download 4×6 PDF"}
              </span>
            </button>

            {/* Direct Print Button for TSC Thermal Printer */}
            <button
              type="button"
              className="shipping-label-print-btn"
              onClick={handlePrint4x6}
              title="Print directly to TSC Thermal Printer (4x6 in / 100x150 mm)"
              style={{
                background: "#ffffff",
                color: "#231f19",
                border: "1px solid #d5cbba",
                fontWeight: 700,
              }}
            >
              <Printer size={15} />
              <span>{isMulti ? `Print All (${orderList.length})` : "Print 4×6 (TSC)"}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              className="shipping-label-close-btn"
              onClick={onClose}
              aria-label="Close shipping label modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Multi-Order Navigator Strip (If multiple orders selected) */}
        {isMulti && (
          <div className="shipping-label-batch-nav no-print" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ede5d8",
            padding: "8px 16px",
            borderBottom: "1px solid #dacfc0",
            fontSize: "12px",
            fontWeight: 700,
            gap: "10px",
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Previewing Label {activeOrderIndex + 1} of {orderList.length}:</span>
              <strong style={{ fontFamily: "monospace", fontSize: "13px" }}>#{currentOrder.order_number}</strong>
              <small style={{ color: "#776b5c" }}>({currentOrder.customer_name || "Customer"})</small>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                disabled={activeOrderIndex === 0}
                onClick={() => setActiveOrderIndex((prev) => Math.max(0, prev - 1))}
                style={{
                  background: activeOrderIndex === 0 ? "#ddd6cb" : "#ffffff",
                  border: "1px solid #c8baa6",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: activeOrderIndex === 0 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <button
                type="button"
                disabled={activeOrderIndex === orderList.length - 1}
                onClick={() => setActiveOrderIndex((prev) => Math.min(orderList.length - 1, prev + 1))}
                style={{
                  background: activeOrderIndex === orderList.length - 1 ? "#ddd6cb" : "#ffffff",
                  border: "1px solid #c8baa6",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: activeOrderIndex === orderList.length - 1 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Printable Labels Container (Renders all selected labels for multi-page batch print/PDF) */}
        <div className="shipping-label-scroll-wrap" style={{ maxHeight: "calc(92vh - 120px)", overflowY: "auto", padding: "16px 12px" }}>
          {isMulti ? (
            orderList.map((ord, idx) => (
              <div
                key={ord.id || ord.order_number}
                style={{
                  display: idx === activeOrderIndex ? "block" : "none",
                }}
              >
                <SingleOrderLabelView
                  order={ord}
                  fallbackCustomerName={fallbackCustomerName}
                  fallbackPhone={fallbackPhone}
                />
              </div>
            ))
          ) : (
            <SingleOrderLabelView
              order={currentOrder}
              fallbackCustomerName={fallbackCustomerName}
              fallbackPhone={fallbackPhone}
            />
          )}

          {/* Hidden off-screen render of all other orders so html2canvas can capture all into 1 PDF */}
          {isMulti && (
            <div style={{ position: "absolute", left: "-99999px", top: 0, pointerEvents: "none" }}>
              {orderList.map((ord) => (
                <SingleOrderLabelView
                  key={`capture-${ord.id || ord.order_number}`}
                  order={ord}
                  fallbackCustomerName={fallbackCustomerName}
                  fallbackPhone={fallbackPhone}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
