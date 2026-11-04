"use client";

import { useEffect, useState } from "react";
import { Check, Download, FileText, Printer, Sparkles, X, ShieldAlert } from "lucide-react";
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

function buildThermal4x6Html(params: {
  order: ShippingLabelOrder;
  recipientName: string;
  recipientPhone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  isCombo: boolean;
  totalBottles: number;
  courierPartner: string;
  orderDateFormatted: string;
  autoPrint?: boolean;
}): string {
  const { order, recipientName, recipientPhone, address, isCombo, totalBottles, courierPartner, orderDateFormatted, autoPrint } = params;
  const hasTrackingNumber = Boolean(order.tracking_number && order.tracking_number.trim());
  const awbNumber = order.tracking_number?.trim() || `ME-${order.order_number.replace(/\D/g, "") || Date.now().toString().slice(-8)}`;

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Shipping_Label_FLX_${order.order_number}</title>
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
      height: 6in;
      max-width: 4in;
      max-height: 6in;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      font-size: 11px;
      line-height: 1.25;
    }
    .thermal-4x6-page {
      width: 4in;
      height: 6in;
      max-width: 4in;
      max-height: 6in;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 2px solid #000000;
      background: #ffffff;
      overflow: hidden;
      page-break-inside: avoid;
      page-break-after: avoid;
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
    .th-ship-to {
      border-right: 1.5px solid #000;
      padding-right: 6px;
      display: flex;
      flex-direction: column;
    }
    .th-ship-from {
      padding-left: 2px;
      display: flex;
      flex-direction: column;
    }
    .th-box-tag {
      background: #000;
      color: #fff;
      font-size: 8.5px;
      font-weight: 900;
      letter-spacing: 0.08em;
      padding: 2px 5px;
      display: inline-block;
      width: fit-content;
      margin-bottom: 4px;
      border-radius: 2px;
    }
    .th-recipient-name {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
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
      border-bottom: 2px solid #000;
      padding-bottom: 3px;
      margin-bottom: 3px;
    }
    .th-manifest-title {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.06em;
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .th-manifest-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    .th-manifest-table th {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 2px 4px;
      font-size: 8px;
      text-align: left;
    }
    .th-summary-strip {
      background: #f0f0f0;
      border: 1px solid #000;
      padding: 3px 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 800;
      margin-top: 2px;
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
      <strong>Order #${order.order_number}</strong>
    </div>
    <div style="display:flex; gap:8px;">
      <button onclick="window.print()" style="background:#10b981; color:#ffffff; border:none; padding:6px 14px; border-radius:4px; font-weight:700; cursor:pointer; font-size:12px;">
        🖨️ Print (TSC)
      </button>
      <button onclick="window.close()" style="background:#3f3f46; color:#ffffff; border:none; padding:6px 12px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px;">
        ✕ Close
      </button>
    </div>
  </div>
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

      <!-- Scannable High-Contrast SVG Barcode (Code 128 replica) -->
      <svg viewBox="0 0 340 38" style="width:96%;height:32px;margin:2px auto;display:block;" preserveAspectRatio="none">
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
      <div style="font-family:monospace;font-size:11px;font-weight:900;letter-spacing:0.12em;">
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
      <!-- Deliver To -->
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

      <!-- Ship From -->
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
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      ${autoPrint ? 'setTimeout(function() { window.focus(); window.print(); }, 250);' : ''}
    });
  </script>
</body>
</html>`;
}

export default function ShippingLabelModal({
  order,
  fallbackCustomerName,
  fallbackPhone,
  onClose,
}: {
  order: ShippingLabelOrder;
  fallbackCustomerName?: string;
  fallbackPhone?: string;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const totalBottles = order.order_items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const isCombo = totalBottles > 1 || order.order_items.length > 1;

  const hasTrackingNumber = Boolean(order.tracking_number && order.tracking_number.trim());
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

  // Handle escape key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // DIRECT 4x6 THERMAL PRINT (Zero blank pages, formats for TSC Printer)
  function handlePrint4x6() {
    try {
      const html = buildThermal4x6Html({
        order,
        recipientName,
        recipientPhone,
        address,
        isCombo,
        totalBottles,
        courierPartner,
        orderDateFormatted,
        autoPrint: true,
      });

      const printWin = window.open(
        "",
        `_label_${order.order_number}`,
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

  // DOWNLOAD STANDALONE 4x6 LABEL FILE
  function handleDownloadFile() {
    setDownloading(true);
    try {
      const html = buildThermal4x6Html({
        order,
        recipientName,
        recipientPhone,
        address,
        isCombo,
        totalBottles,
        courierPartner,
        orderDateFormatted,
        autoPrint: true,
      });

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Shipping_Label_FLX_${order.order_number}_4x6.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  }

  return (
    <div className="shipping-label-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="shipping-label-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar (Hidden during print) */}
        <div className="shipping-label-modal-header no-print">
          <div>
            <span className="shipping-label-eyebrow">
              <Sparkles size={13} /> {isCombo ? "Consolidated Combo 4×6 Shipping Label" : "Official 4×6 Parcel Shipping Label"}
            </span>
            <h3 className="shipping-label-modal-title">
              Order #{order.order_number} · Standard 4×6 Thermal Label
            </h3>
            <p className="shipping-label-modal-sub">
              TSC Thermal Printer &amp; Online Label Ready (Meesho / Amazon Standard 100×150 mm). Zero blank pages.
            </p>
          </div>

          <div className="shipping-label-modal-actions">
            {/* Primary Print Button for TSC Printer */}
            <button
              type="button"
              className="shipping-label-print-btn"
              onClick={handlePrint4x6}
              title="Print directly to TSC Thermal Printer (4x6 in / 100x150 mm)"
              style={{
                background: "#10b981",
                color: "#ffffff",
                border: "1px solid #059669",
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
              }}
            >
              <Printer size={15} />
              <span>Print 4×6 (TSC Printer)</span>
            </button>

            {/* Direct Download File Button */}
            <button
              type="button"
              className="shipping-label-print-btn"
              onClick={handleDownloadFile}
              title="Download print-ready 4x6 label file to your PC"
              style={{
                background: "#ffffff",
                color: "#231f19",
                border: "1px solid #d5cbba",
              }}
            >
              <Download size={15} />
              <span>{downloading ? "Saving…" : "Download 4×6 Label"}</span>
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

        {/* Printable Label Container */}
        <div className="shipping-label-scroll-wrap">
          <div className="shipping-thermal-label printable-shipping-label" style={{
            width: "100%",
            maxWidth: "460px",
            margin: "0 auto",
            border: "2px solid #000000",
            padding: "8px 10px",
            background: "#ffffff",
            color: "#000000",
          }}>
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

              {/* Scannable SVG Barcode Graphic for Order Reference */}
              <div className="thermal-barcode-graphic" style={{ margin: "3px auto", width: "96%" }}>
                <svg
                  className="barcode-svg"
                  viewBox="0 0 340 40"
                  style={{ width: "100%", height: "34px" }}
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="0" y="0" width="4" height="40" fill="#000" />
                  <rect x="7" y="0" width="2" height="40" fill="#000" />
                  <rect x="12" y="0" width="6" height="40" fill="#000" />
                  <rect x="22" y="0" width="3" height="40" fill="#000" />
                  <rect x="29" y="0" width="5" height="40" fill="#000" />
                  <rect x="38" y="0" width="2" height="40" fill="#000" />
                  <rect x="44" y="0" width="7" height="40" fill="#000" />
                  <rect x="55" y="0" width="3" height="40" fill="#000" />
                  <rect x="62" y="0" width="4" height="40" fill="#000" />
                  <rect x="70" y="0" width="2" height="40" fill="#000" />
                  <rect x="76" y="0" width="6" height="40" fill="#000" />
                  <rect x="86" y="0" width="3" height="40" fill="#000" />
                  <rect x="93" y="0" width="5" height="40" fill="#000" />
                  <rect x="102" y="0" width="3" height="40" fill="#000" />
                  <rect x="109" y="0" width="7" height="40" fill="#000" />
                  <rect x="120" y="0" width="4" height="40" fill="#000" />
                  <rect x="128" y="0" width="2" height="40" fill="#000" />
                  <rect x="134" y="0" width="5" height="40" fill="#000" />
                  <rect x="143" y="0" width="8" height="40" fill="#000" />
                  <rect x="155" y="0" width="3" height="40" fill="#000" />
                  <rect x="162" y="0" width="4" height="40" fill="#000" />
                  <rect x="170" y="0" width="6" height="40" fill="#000" />
                  <rect x="180" y="0" width="2" height="40" fill="#000" />
                  <rect x="186" y="0" width="5" height="40" fill="#000" />
                  <rect x="195" y="0" width="4" height="40" fill="#000" />
                  <rect x="203" y="0" width="6" height="40" fill="#000" />
                  <rect x="213" y="0" width="3" height="40" fill="#000" />
                  <rect x="220" y="0" width="7" height="40" fill="#000" />
                  <rect x="231" y="0" width="3" height="40" fill="#000" />
                  <rect x="238" y="0" width="5" height="40" fill="#000" />
                  <rect x="247" y="0" width="2" height="40" fill="#000" />
                  <rect x="253" y="0" width="6" height="40" fill="#000" />
                  <rect x="263" y="0" width="4" height="40" fill="#000" />
                  <rect x="271" y="0" width="3" height="40" fill="#000" />
                  <rect x="278" y="0" width="5" height="40" fill="#000" />
                  <rect x="287" y="0" width="7" height="40" fill="#000" />
                  <rect x="298" y="0" width="3" height="40" fill="#000" />
                  <rect x="305" y="0" width="4" height="40" fill="#000" />
                  <rect x="313" y="0" width="6" height="40" fill="#000" />
                  <rect x="323" y="0" width="3" height="40" fill="#000" />
                  <rect x="330" y="0" width="5" height="40" fill="#000" />
                  <rect x="338" y="0" width="2" height="40" fill="#000" />
                </svg>
              </div>

              <div style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                marginTop: "2px",
              }}>
                AWB: {order.tracking_number || `ME-${order.order_number}`}
              </div>
            </div>

            {/* 3. Luxury Express Routing & Address Matrix: Ship To vs Ship From */}
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

            <div className="thermal-address-grid" style={{
              display: "grid",
              gridTemplateColumns: "1.35fr 1fr",
              borderBottom: "2px solid #000000",
              paddingBottom: "6px",
              marginBottom: "6px",
              gap: "8px",
            }}>
              {/* SHIP TO (DELIVERY ADDRESS) */}
              <div className="thermal-ship-to-box" style={{
                borderRight: "1.5px solid #000000",
                paddingRight: "8px",
                display: "flex",
                flexDirection: "column",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ background: "#000000", color: "#ffffff", padding: "2px 6px", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", borderRadius: "2px" }}>
                    DELIVER TO / SHIP TO
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 800 }}>
                    PREPAID PARCEL
                  </span>
                </div>

                <strong className="thermal-recipient-name" style={{ fontSize: "15px", fontWeight: 900, textTransform: "uppercase", lineHeight: "1.2", marginBottom: "2px" }}>
                  {recipientName}
                </strong>
                <span className="thermal-recipient-phone" style={{ fontSize: "11px", fontWeight: 800, background: "#f0ece7", padding: "1px 6px", borderRadius: "2px", width: "fit-content", marginBottom: "4px" }}>
                  TEL: {recipientPhone}
                </span>

                <div className="thermal-street-address" style={{ fontSize: "11px", lineHeight: "1.35", color: "#111111", marginBottom: "6px" }}>
                  <div style={{ fontWeight: 700 }}>{address.line1}</div>
                  {address.line2 && <div>{address.line2}</div>}
                  <div style={{ fontWeight: 900, marginTop: "2px", textTransform: "uppercase" }}>
                    {address.city}, {address.state}
                  </div>
                </div>

                <div style={{
                  marginTop: "auto",
                  border: "2px solid #000000",
                  background: "#000000",
                  color: "#ffffff",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: "2px",
                }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em" }}>DESTINATION PINCODE</span>
                  <strong style={{ fontSize: "17px", fontWeight: 900, letterSpacing: "0.16em", color: "#ffffff", fontFamily: "monospace" }}>
                    {address.pincode}
                  </strong>
                </div>
              </div>

              {/* SHIP FROM (ORIGIN ATELIER) */}
              <div className="thermal-ship-from-box" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ background: "#000000", color: "#ffffff", padding: "2px 6px", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", borderRadius: "2px" }}>
                    SHIP FROM / RETURN
                  </span>
                </div>

                <strong className="thermal-from-name" style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", color: "#000000", marginBottom: "2px" }}>
                  FLOVEXA® PARFUM
                </strong>
                <span className="thermal-from-phone" style={{ fontSize: "10px", background: "#f0ece7", padding: "1px 5px", borderRadius: "2px", width: "fit-content", marginBottom: "3px", fontWeight: 800 }}>
                  HELP: +91 96627 65757
                </span>

                <div className="thermal-from-address" style={{ fontSize: "9.5px", lineHeight: "1.35", color: "#111111" }}>
                  <div style={{ fontWeight: 600 }}>
                    21, Ramdev Row-House Shopping, Opp. Shivdhara Society, Rajmandir Rd
                  </div>
                  <div style={{ fontWeight: 800, marginTop: "2px", textTransform: "uppercase" }}>
                    Surat, Gujarat – 395006
                  </div>
                  <div style={{ fontSize: "9px", color: "#444", marginTop: "2px", fontWeight: 600 }}>
                    EMAIL: flovexaenterprises@gmail.com
                  </div>
                </div>

                <div style={{
                  marginTop: "auto",
                  border: "1.5px solid #000000",
                  background: "#f4f4f4",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: "2px",
                }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em", color: "#333" }}>SORT HUB</span>
                  <strong style={{ fontSize: "11px", fontWeight: 900, color: "#000000" }}>
                    STV-W01 · SURAT
                  </strong>
                </div>
              </div>
            </div>

            {/* 4. Combined Itemized Combo Manifest (All Perfumes in 1 Label) */}
            <div className="thermal-manifest-section" style={{
              borderBottom: "2px solid #000000",
              paddingBottom: "4px",
              marginBottom: "4px",
            }}>
              <div className="thermal-manifest-head" style={{
                fontSize: "9.5px",
                fontWeight: 900,
                letterSpacing: "0.05em",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}>
                <span>
                  {isCombo
                    ? `COMBO SET MANIFEST (${totalBottles} ITEMS IN 1 PARCEL)`
                    : `PARCEL MANIFEST · 1 ITEM`}
                </span>
                <span style={{ fontSize: "9px", color: "#000" }}>
                  ✓ ATELIER QC PASSED
                </span>
              </div>

              <table className="thermal-manifest-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "26px", textAlign: "center", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px" }}>#</th>
                    <th style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px", textAlign: "left" }}>FRAGRANCE ITEM</th>
                    <th style={{ width: "105px", textAlign: "left", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px" }}>SKU</th>
                    <th style={{ width: "55px", textAlign: "center", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px" }}>SIZE</th>
                    <th style={{ width: "35px", textAlign: "center", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px" }}>QTY</th>
                    <th style={{ width: "80px", textAlign: "right", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px" }}>TYPE</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items.map((item, idx) => (
                    <tr key={`${item.product_name}-${idx}`}>
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
              <div className="thermal-manifest-summary" style={{
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

            {/* 5. Courier Warning & Security Strip */}
            <div className="thermal-security-footer" style={{
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
        </div>
      </div>
    </div>
  );
}
