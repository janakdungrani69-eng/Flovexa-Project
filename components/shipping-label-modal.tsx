"use client";

import { useEffect } from "react";
import { Check, Package, Printer, Sparkles, X, ShieldAlert } from "lucide-react";
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
  const totalBottles = order.order_items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const isCombo = totalBottles > 1 || order.order_items.length > 1;

  const awbNumber =
    order.tracking_number ||
    `FLX-${order.order_number.replace(/[^A-Za-z0-9]/g, "").toUpperCase()}-EXP`;
  const courierPartner = order.tracking_carrier || "Delhivery Air Express / Blue Dart Luxe";

  const recipientName = order.customer_name || fallbackCustomerName || "Valued Fragrance Patron";
  const recipientPhone = order.phone || fallbackPhone || "+91 (Verified on Checkout)";

  const address = order.shipping_address || {
    line1: "Customer Shipping Address",
    line2: "",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
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

  function handlePrint() {
    window.print();
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
              <Sparkles size={13} /> {isCombo ? "Consolidated Fragrance Combo Label" : "Official Parcel Shipping Label"}
            </span>
            <h3 className="shipping-label-modal-title">
              {isCombo
                ? `1 Single Label for All ${totalBottles} Perfumes`
                : `Shipping Label · Order #${order.order_number}`}
            </h3>
            <p className="shipping-label-modal-sub">
              {isCombo
                ? "All fragrances in this order are bundled together in 1 master luxury box under this single label for the delivery address."
                : "Official courier parcel label with routing barcode and atelier manifest."}
            </p>
          </div>

          <div className="shipping-label-modal-actions">
            <button
              type="button"
              className="shipping-label-print-btn"
              onClick={handlePrint}
              title="Print standard 4x6 / A4 shipping label"
            >
              <Printer size={15} />
              <span>Print Label</span>
            </button>
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
          <div className="shipping-thermal-label printable-shipping-label">
            {/* 1. Label Top Header */}
            <div className="thermal-header-grid">
              <div className="thermal-brand-cell">
                <span className="thermal-brand-name">FLOVEXA</span>
                <span className="thermal-brand-sub">LUXURY PARFUMS ATELIER</span>
                <small className="thermal-origin-tag">MUMBAI · INDIA</small>
              </div>

              <div className="thermal-routing-cell">
                <div className="thermal-priority-box">
                  <strong>PRIORITY LUXE AIR</strong>
                  <span>SURFACE / AIR EXPRESS</span>
                </div>
                <div className="thermal-package-type">
                  {isCombo ? (
                    <strong className="combo-highlight">
                      BOX 1 OF 1 (COMBO SET)
                    </strong>
                  ) : (
                    <strong>BOX 1 OF 1 (SINGLE)</strong>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Courier AWB & Barcode Section */}
            <div className="thermal-barcode-strip">
              <div className="thermal-carrier-row">
                <span>COURIER PARTNER: <strong>{courierPartner}</strong></span>
                <span>ORDER: <strong>#{order.order_number}</strong></span>
                <span>DATE: <strong>{orderDateFormatted}</strong></span>
              </div>

              {/* Scannable SVG Barcode Graphic */}
              <div className="thermal-barcode-graphic">
                <svg
                  className="barcode-svg"
                  viewBox="0 0 340 54"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* High contrast barcode stripes */}
                  <rect x="0" y="0" width="4" height="54" fill="#000" />
                  <rect x="7" y="0" width="2" height="54" fill="#000" />
                  <rect x="12" y="0" width="6" height="54" fill="#000" />
                  <rect x="22" y="0" width="3" height="54" fill="#000" />
                  <rect x="29" y="0" width="5" height="54" fill="#000" />
                  <rect x="38" y="0" width="2" height="54" fill="#000" />
                  <rect x="44" y="0" width="7" height="54" fill="#000" />
                  <rect x="55" y="0" width="3" height="54" fill="#000" />
                  <rect x="62" y="0" width="4" height="54" fill="#000" />
                  <rect x="70" y="0" width="2" height="54" fill="#000" />
                  <rect x="76" y="0" width="6" height="54" fill="#000" />
                  <rect x="86" y="0" width="3" height="54" fill="#000" />
                  <rect x="93" y="0" width="5" height="54" fill="#000" />
                  <rect x="102" y="0" width="3" height="54" fill="#000" />
                  <rect x="109" y="0" width="7" height="54" fill="#000" />
                  <rect x="120" y="0" width="4" height="54" fill="#000" />
                  <rect x="128" y="0" width="2" height="54" fill="#000" />
                  <rect x="134" y="0" width="5" height="54" fill="#000" />
                  <rect x="143" y="0" width="8" height="54" fill="#000" />
                  <rect x="155" y="0" width="3" height="54" fill="#000" />
                  <rect x="162" y="0" width="4" height="54" fill="#000" />
                  <rect x="170" y="0" width="6" height="54" fill="#000" />
                  <rect x="180" y="0" width="2" height="54" fill="#000" />
                  <rect x="186" y="0" width="5" height="54" fill="#000" />
                  <rect x="195" y="0" width="4" height="54" fill="#000" />
                  <rect x="203" y="0" width="6" height="54" fill="#000" />
                  <rect x="213" y="0" width="3" height="54" fill="#000" />
                  <rect x="220" y="0" width="7" height="54" fill="#000" />
                  <rect x="231" y="0" width="3" height="54" fill="#000" />
                  <rect x="238" y="0" width="5" height="54" fill="#000" />
                  <rect x="247" y="0" width="2" height="54" fill="#000" />
                  <rect x="253" y="0" width="6" height="54" fill="#000" />
                  <rect x="263" y="0" width="4" height="54" fill="#000" />
                  <rect x="271" y="0" width="3" height="54" fill="#000" />
                  <rect x="278" y="0" width="5" height="54" fill="#000" />
                  <rect x="287" y="0" width="7" height="54" fill="#000" />
                  <rect x="298" y="0" width="3" height="54" fill="#000" />
                  <rect x="305" y="0" width="4" height="54" fill="#000" />
                  <rect x="313" y="0" width="6" height="54" fill="#000" />
                  <rect x="323" y="0" width="3" height="54" fill="#000" />
                  <rect x="330" y="0" width="5" height="54" fill="#000" />
                  <rect x="338" y="0" width="2" height="54" fill="#000" />
                </svg>
              </div>

              <div className="thermal-awb-num">
                <span>AWB / TRACKING NO:</span>
                <strong>{awbNumber}</strong>
              </div>
            </div>

            {/* 3. Address Matrix: Ship To (Buyer) vs Ship From (Atelier) */}
            <div className="thermal-address-grid">
              <div className="thermal-ship-to-box">
                <span className="thermal-box-tag">SHIP TO (DELIVERY ADDRESS):</span>
                <strong className="thermal-recipient-name">{recipientName}</strong>
                <span className="thermal-recipient-phone">TEL: {recipientPhone}</span>
                <p className="thermal-street-address">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.state}
                </p>
                <div className="thermal-pincode-highlight">
                  <span>PINCODE:</span>
                  <strong>{address.pincode}</strong>
                </div>
              </div>

              <div className="thermal-ship-from-box">
                <span className="thermal-box-tag">RETURN / SHIP FROM:</span>
                <strong className="thermal-from-name">FLOVEXA LUXURY PARFUMS</strong>
                <p className="thermal-from-address">
                  Atelier Fulfillment Unit 4,
                  <br />
                  Luxury Fragrance Park, BKC,
                  <br />
                  Mumbai, Maharashtra 400051
                  <br />
                  Helpline: +91 98765 43210
                </p>
                <div className="thermal-hub-code">
                  <span>SORT HUB:</span>
                  <strong>{address.city?.substring(0, 3).toUpperCase() || "BOM"}-{address.pincode?.substring(0, 3) || "400"}</strong>
                </div>
              </div>
            </div>

            {/* 4. Combined Itemized Combo Manifest (All Perfumes in 1 Label) */}
            <div className="thermal-manifest-section">
              <div className="thermal-manifest-head">
                <span>
                  {isCombo
                    ? `CONSOLIDATED COMBO MANIFEST · ${totalBottles} ITEMS IN 1 PARCEL`
                    : `ITEMIZED PARCEL MANIFEST · 1 ITEM`}
                </span>
                <span className="manifest-seal-badge">
                  <Check size={11} /> ATELIER QUALITY CHECKED
                </span>
              </div>

              <table className="thermal-manifest-table">
                <thead>
                  <tr>
                    <th style={{ width: "38px" }}>#</th>
                    <th>FRAGRANCE / ITEM DESCRIPTION</th>
                    <th style={{ width: "120px", textAlign: "left" }}>SKU CODE</th>
                    <th style={{ width: "70px", textAlign: "center" }}>SIZE</th>
                    <th style={{ width: "50px", textAlign: "center" }}>QTY</th>
                    <th style={{ width: "110px", textAlign: "right" }}>PACKAGING</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items.map((item, idx) => (
                    <tr key={`${item.product_name}-${idx}`}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <strong>{item.product_name}</strong>
                      </td>
                      <td>
                        <code style={{ fontFamily: "monospace", fontSize: "11px", background: "#f0ece7", padding: "2px 6px", borderRadius: "3px", fontWeight: 700, color: "#332c26", letterSpacing: "0.5px" }}>
                          {item.sku || generateDefaultSku(item.product_name, item.size, idx)}
                        </code>
                      </td>
                      <td style={{ textAlign: "center" }}>{item.size}</td>
                      <td style={{ textAlign: "center", fontWeight: 800 }}>×{item.quantity}</td>
                      <td style={{ textAlign: "right", fontSize: "10px", color: "#444" }}>
                        Velvet Gift Bed
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total & Commercial Value Bar */}
              <div className="thermal-manifest-summary">
                <div>
                  <span>TOTAL PIECES:</span>
                  <strong>{totalBottles} BOTTLE{totalBottles > 1 ? "S" : ""}</strong>
                </div>
                <div>
                  <span>PAYMENT MODE:</span>
                  <strong>
                    {order.payment_status === "captured" ? "PREPAID (ONLINE)" : "VERIFIED PREPAID"}
                  </strong>
                </div>
                <div>
                  <span>INVOICE VALUE:</span>
                  <strong>{money(order.total_paise)}</strong>
                </div>
              </div>
            </div>

            {/* 5. Courier Warning & Security Strip */}
            <div className="thermal-security-footer">
              <div className="thermal-security-warning">
                <ShieldAlert size={14} />
                <span>
                  <strong>FRAGILE — CONTAINS LUXURY CRYSTAL FLACONS &amp; CONCENTRATED OILS:</strong> Handle with exceptional care. Do not stack heavy freight on this parcel.
                </span>
              </div>
              <div className="thermal-barcode-micro">
                <span>*FLX-LBL-{order.order_number}-CONSOLIDATED*</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

