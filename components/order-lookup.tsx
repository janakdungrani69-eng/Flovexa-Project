"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, PackageCheck, Sparkles, Star, Truck } from "lucide-react";
import { money } from "@/lib/money";
import { generateDefaultSku } from "@/lib/products";

type Result = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalPaise: number;
  discountPaise: number;
  couponCode: string | null;
  createdAt: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: { product_name: string; size: string; quantity: number }[];
  shipments: {
    status: string;
    trackingCarrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    storeName: string;
  }[];
};

export default function OrderLookup() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not find your order.");
      setResult(data.order);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Order lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="order-lookup">
      <form onSubmit={submit}>
        <label>
          Order number
          <input
            required
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
            placeholder="FLX-260926-12AB34CD56EF"
          />
        </label>
        <label>
          Checkout email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>
        {error && (
          <p className="checkout-message" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={loading}>
          {loading ? "Looking up order…" : "Find my order"}
          <ArrowRight size={16} />
        </button>
      </form>

      {result && (
        <section className="order-lookup-result">
          <div className="order-result-head">
            <div>
              <span className="eyebrow">ORDER {result.orderNumber}</span>
              <h2>{result.status.replaceAll("_", " ")}</h2>
            </div>
            <PackageCheck size={25} />
          </div>

          {/* Delivered Thank You & Rating Card */}
          {result.status === "delivered" && (
            <div
              style={{
                margin: "16px 0",
                padding: "16px 18px",
                background: "#fdfbf7",
                border: "1px solid #ebd9bf",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <strong
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#8a6639",
                    fontSize: "13px",
                  }}
                >
                  <Sparkles size={16} color="#aa8050" /> Parcel Hand-Delivered Successfully
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#615446" }}>
                  Thank you for choosing Flovexa Artisanal Fragrances! How was your sillage experience? Sign in to your
                  account to share your verified review on Flovexa.in.
                </p>
              </div>
              <Link
                href="/account"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#aa8050",
                  color: "#fff",
                  padding: "9px 18px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <Star size={13} fill="#fff" color="#fff" />
                <span>Rate &amp; Review</span>
              </Link>
            </div>
          )}

          <div className="order-result-items">
            {result.items.map((item, index) => (
              <div key={`${item.product_name}-${index}`}>
                <span>
                  {item.product_name} · {item.size} × {item.quantity} ·{" "}
                  <code style={{ fontSize: "10px", background: "#ded8cc", padding: "1px 5px", borderRadius: "3px" }}>
                    SKU: {generateDefaultSku(item.product_name, item.size, index)}
                  </code>
                </span>
              </div>
            ))}
          </div>

          {result.discountPaise > 0 && (
            <div className="order-result-total">
              <span>Discount{result.couponCode ? ` · ${result.couponCode}` : ""}</span>
              <b>−{money(result.discountPaise)}</b>
            </div>
          )}

          <div className="order-result-total">
            <span>Order total</span>
            <b>{money(result.totalPaise)}</b>
          </div>

          {result.shipments?.length
            ? result.shipments.map((shipment, index) => (
                <div className="seller-tracking-row" key={`${result.orderNumber}-${index}`}>
                  <span>
                    {shipment.storeName} · {shipment.status.replaceAll("_", " ")}
                  </span>
                  {shipment.trackingUrl && (
                    <a href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                      {shipment.trackingCarrier || "Track shipment"}
                      {shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ""}
                      <ArrowRight size={14} />
                    </a>
                  )}
                </div>
              ))
            : result.trackingUrl && (
                <a className="tracking-link" href={result.trackingUrl} target="_blank" rel="noreferrer">
                  <Truck size={15} />
                  {result.trackingCarrier || "Track shipment"} · {result.trackingNumber}
                  <ArrowRight size={15} />
                </a>
              )}

          <p className="order-result-date">
            Placed {new Date(result.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </section>
      )}
    </div>
  );
}
