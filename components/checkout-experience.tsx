"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";
import CheckoutForm from "@/components/checkout-form";
import type { Product } from "@/lib/products";
import type { OrderPricing } from "@/lib/pricing";

type CartLine = { productId: string; quantity: number };
type SummaryLine = { product: Product; quantity: number };
type CouponQuote = OrderPricing & { code: string; discountPaise: number };
type CustomerPrefill = { name: string; email: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default function CheckoutExperience({ items, lines, subtotalPaise, pricing, enabled, initialCustomer }: {
  items: CartLine[];
  lines: SummaryLine[];
  subtotalPaise: number;
  pricing: OrderPricing | null;
  enabled: boolean;
  initialCustomer?: CustomerPrefill;
}) {
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponQuote | null>(null);
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  async function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCouponError("");
    setCoupon(null);
    setCheckingCoupon(true);
    try {
      const response = await fetch("/api/checkout/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, items }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not apply this coupon.");
      setCoupon({
        code: result.code,
        subtotalPaise: result.subtotalPaise,
        discountPaise: result.discountPaise,
        shippingPaise: result.shippingPaise,
        taxPaise: result.taxPaise,
        totalPaise: result.totalPaise,
        taxIncluded: result.taxIncluded,
      });
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : "Could not apply this coupon.");
    } finally {
      setCheckingCoupon(false);
    }
  }

  const safePricing: OrderPricing = pricing || {
    subtotalPaise,
    shippingPaise: 0,
    taxPaise: Math.round((subtotalPaise * 1800) / 11800),
    totalPaise: subtotalPaise,
    taxIncluded: true,
  };
  const shownPricing = coupon ?? safePricing;
  const totalItemCount = lines.reduce((s, l) => s + l.quantity, 0);

  return <div className="checkout-layout">
    <section className="checkout-main"><span className="eyebrow">ALMOST YOURS</span><h1>Delivery details</h1><p className="checkout-lede">Tell us where to send your fragrance.</p>
      <CheckoutForm items={items} enabled={enabled} initialCustomer={initialCustomer} couponCode={coupon?.code} />
    </section>
    <aside className="order-summary"><span className="eyebrow">YOUR SELECTION</span><h2>Order summary</h2>
      {totalItemCount > 1 && (
        <div className="checkout-combo-banner">
          <div className="checkout-combo-badge">
            <Sparkles size={13} />
            <span>Multi-Perfume Combo Active ({totalItemCount} Items)</span>
          </div>
          <p>
            All fragrances will be consolidated in 1 signature Flovexa luxury box with <strong>1 single parcel label</strong> for your delivery address.
          </p>
        </div>
      )}
      {lines.length ? (
        <div className="summary-lines">
          {lines.map(({ product, quantity }) => (
            <div className="summary-product" key={product.id}>
              <div className="summary-product-visual" style={{ "--juice": product.accent } as React.CSSProperties}>
                <span>{product.id === "free-10ml-gift" ? "🎁" : "F"}</span>
              </div>
              <div>
                <b>{product.name}</b>
                <small>
                  {product.size} · Qty {quantity}
                  {product.pricePaise === 0 && (
                    <span style={{ marginLeft: 6, color: "#257a3e", fontWeight: 700, fontSize: "10px" }}>
                      · COMPLIMENTARY
                    </span>
                  )}
                </small>
              </div>
              {product.pricePaise === 0 ? (
                <strong style={{ color: "#257a3e", fontWeight: 800 }}>FREE</strong>
              ) : (
                <strong>{money(product.pricePaise * quantity)}</strong>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="summary-empty">Your bag is empty. <Link href="/#collection">Explore fragrances</Link></div>
      )}
      <form className="coupon-entry" onSubmit={applyCoupon}>
        <label htmlFor="checkout-coupon">Discount code</label>
        <div><input id="checkout-coupon" value={couponCode} disabled={!enabled || checkingCoupon} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCoupon(null); setCouponError(""); }} placeholder="Enter code" maxLength={32} /><button type="submit" disabled={!enabled || checkingCoupon || !couponCode.trim()}>{checkingCoupon ? "Checking…" : "Apply"}</button></div>
        {coupon && <p className="coupon-applied" role="status"><Check size={14}/> {coupon.code} applied <button type="button" onClick={() => { setCoupon(null); setCouponCode(""); }} aria-label="Remove coupon"><X size={14}/></button></p>}
        {couponError && <p className="coupon-error" role="alert">{couponError}</p>}
      </form>
      <div className="summary-costs"><div><span>Subtotal</span><strong>{money(subtotalPaise)}</strong></div>{coupon && <div className="summary-discount"><span>Discount · {coupon.code}</span><strong>−{money(coupon.discountPaise)}</strong></div>}{shownPricing ? <><div><span>Shipping</span><strong>{shownPricing.shippingPaise ? money(shownPricing.shippingPaise) : "Complimentary"}</strong></div>{shownPricing.taxPaise > 0 && <div><span>{shownPricing.taxIncluded ? "Included taxes" : "Taxes"}</span><strong>{money(shownPricing.taxPaise)}</strong></div>}<div className="summary-total"><span>Total</span><strong>{money(shownPricing.totalPaise)}</strong></div></> : <p className="summary-note">Shipping and tax settings are being configured. The payment button stays disabled until the total can be confirmed.</p>}</div>
    </aside>
  </div>;
}