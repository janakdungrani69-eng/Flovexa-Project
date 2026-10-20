"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/products";

export function parseProductTitle(rawName: string, defaultConcentration?: string) {
  if (!rawName) return { brand: "FLOVEXA PERFUMES", title: "", subtitle: defaultConcentration || "" };
  let text = rawName.trim();

  // 1. Remove trailing sizes like '– 50ml', '- 50ML', '50ml', '100ml', '– 100 ml', etc.
  text = text.replace(/(?:[\s–—\-|,-]+)?\s*\d+\s*(?:ml|g|oz)\b/gi, "").trim();

  // 2. Extract concentration if embedded in title (e.g. Eau De Perfume, EDP, Fragrance Oil)
  let concentration = defaultConcentration || "";
  const concRegex = /\b(eau de parfum|eau de perfume|extrait de parfum|eau de toilette|fragrance oil|parfum|edp|edt)\b/gi;
  const concMatch = text.match(concRegex);
  if (concMatch) {
    const rawConc = concMatch[0].toLowerCase();
    if (rawConc.includes("perfume") || rawConc.includes("parfum") || rawConc === "edp") {
      concentration = "Eau de Parfum";
    } else if (rawConc.includes("toilette") || rawConc === "edt") {
      concentration = "Eau de Toilette";
    } else if (rawConc.includes("oil")) {
      concentration = "Fragrance Oil";
    } else {
      concentration = rawConc.charAt(0).toUpperCase() + rawConc.slice(1);
    }
    text = text.replace(concRegex, "").trim();
  }

  // Clean trailing or leading punctuation/separators
  text = text.replace(/^[\s–—\-|,-]+|[\s–—\-|,-]+$/g, "").trim();

  // 3. Brand handling: If text starts with 'FLOVEXA', strip leading brand from title
  if (/^flovexa\s+/i.test(text)) {
    const afterBrand = text.replace(/^flovexa\s+/i, "").trim();
    if (afterBrand.length > 0) {
      text = afterBrand;
    }
  }

  // 4. Ensure proper Title Case formatting for any capitalized words
  const formattedTitle = text
    .split(/\s+/)
    .map((word) => {
      if (word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    })
    .join(" ");

  return {
    brand: "FLOVEXA PERFUMES",
    title: formattedTitle || rawName,
    subtitle: concentration || "",
  };
}

function getTitleScaleClass(name: string): string {
  const len = name?.trim().length || 0;
  if (len > 30) return "title-long";
  if (len > 18) return "title-medium";
  return "title-short";
}

export default function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();

  const isFragranceOil = product.category === "Fragrance" || product.concentration.includes("Oil");
  const size1 = isFragranceOil ? "30ml" : "50ml";
  const size2 = isFragranceOil ? "60ml" : "100ml";

  // State
  const [selectedSize, setSelectedSize] = useState<string>(size1);
  const [quantity, setQuantity] = useState(1);
  const [addPodChecked, setAddPodChecked] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  // Parse title cleanly to separate brand, fragrance name, and concentration (strips raw 50ml, etc.)
  const parsed = useMemo(() => {
    return parseProductTitle(product.name, product.concentration);
  }, [product.name, product.concentration]);

  // Prices
  const basePricePaise = product.pricePaise;
  // Larger size is 2x volume with attractive bundle pricing (~1.65x base price)
  const pricePaise = useMemo(() => {
    if (selectedSize === size2) {
      return Math.round(basePricePaise * 1.65);
    }
    return basePricePaise;
  }, [basePricePaise, selectedSize, size2]);

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(pricePaise / 100).replace("₹", "Rs. ");
  }, [pricePaise]);

  // EMI amount (quarter of price)
  const emiAmount = useMemo(() => {
    return Math.round(pricePaise / 100 / 4);
  }, [pricePaise]);

  function updateQuantity(delta: number) {
    setQuantity((current) => Math.max(1, Math.min(20, current + delta)));
  }

  function handleAddToCart() {
    try {
      const stored = JSON.parse(localStorage.getItem("flovexa-cart") ?? "[]");
      const cart: Array<{ productId: string; quantity: number }> = Array.isArray(stored) ? stored : [];

      // Add main perfume
      const existing = cart.find((item) => item.productId === product.id);
      const nextCart = existing
        ? cart.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item)
        : [...cart, { productId: product.id, quantity }];

      // If pod add-on is checked, add demo pod or add-on product
      if (addPodChecked) {
        const podExisting = nextCart.find((item) => item.productId === "addon-travel-pod");
        if (podExisting) {
          podExisting.quantity += 1;
        } else {
          nextCart.push({ productId: "addon-travel-pod", quantity: 1 });
        }
      }

      localStorage.setItem("flovexa-cart", JSON.stringify(nextCart));
      setAddedNotice(true);
      window.setTimeout(() => setAddedNotice(false), 2400);

      // Dispatch custom storage event for sync
      window.dispatchEvent(new Event("storage"));
    } catch {
      setAddedNotice(false);
    }
  }

  function handleBuyItNow() {
    try {
      const checkoutItems = [
        { productId: product.id, quantity },
      ];
      if (addPodChecked) {
        checkoutItems.push({ productId: "addon-travel-pod", quantity: 1 });
      }

      // Also save to cart
      const stored = JSON.parse(localStorage.getItem("flovexa-cart") ?? "[]");
      const cart = Array.isArray(stored) ? stored : [];
      for (const item of checkoutItems) {
        const exist = cart.find((c: { productId: string }) => c.productId === item.productId);
        if (exist) exist.quantity += item.quantity;
        else cart.push(item);
      }
      localStorage.setItem("flovexa-cart", JSON.stringify(cart));

      router.push(`/checkout?items=${encodeURIComponent(JSON.stringify(checkoutItems))}`);
    } catch {
      router.push(`/checkout`);
    }
  }

  return (
    <div className="purchase-panel-structure">
      {/* 1. Brand Eyebrow, Main Luxury Title & Concentration Subtitle */}
      <div className="purchase-header-block">
        <span className="purchase-brand-eyebrow">{parsed.brand}</span>
        <h1 className={`purchase-title ${getTitleScaleClass(parsed.title)}`}>
          {parsed.title}
        </h1>
        {parsed.subtitle && (
          <span className="purchase-fragrance-type">{parsed.subtitle}</span>
        )}
      </div>

      {/* 2. Rating & Reviews */}
      <div className="purchase-rating-row">
        <span className="purchase-stars">★★★★★</span>
        <span className="purchase-rating-score">4.63</span>
        <span className="purchase-rating-pipe">|</span>
        <span className="purchase-rating-reviews">161 reviews</span>
      </div>

      {/* 3. Feature Pills */}
      <div className="purchase-pills-row">
        <div className="purchase-feature-pill">Built for Indian Weather</div>
        <div className="purchase-feature-pill">
          {isFragranceOil ? "100% Pure Fragrance Oil" : "50% Oil Concentration"}
        </div>
      </div>

      {/* 4. Size Selector */}
      <div className="purchase-size-section">
        <div className="purchase-size-label">Size:</div>
        <div className="purchase-size-options">
          <button
            type="button"
            className={`purchase-size-btn ${selectedSize === size1 ? "is-selected" : ""}`}
            onClick={() => setSelectedSize(size1)}
          >
            {size1}
          </button>

          <button
            type="button"
            className={`purchase-size-btn ${selectedSize === size2 ? "is-selected" : ""}`}
            onClick={() => setSelectedSize(size2)}
          >
            <span className="purchase-size-badge">2x More Values</span>
            {size2}
          </button>
        </div>
      </div>

      {/* 5. Main Price */}
      <div className="purchase-main-price">{formattedPrice}</div>

      {/* 6. EMI / Pay Later Banner */}
      <div className="purchase-emi-banner">
        <span className="purchase-new-tag">NEW</span>
        <div className="purchase-emi-text">
          or Pay <strong className="emi-green">₹{emiAmount} now</strong> &amp; rest later at<br />
          <strong>0% EMI</strong> on <span className="upi-logo-text">UPI</span> via <span className="mop-logo-text">PAY LATER</span>
        </div>
        <div className="purchase-snapmint-btn">
          <span>BUY ON EMI</span>
          <small>By snapmint</small>
        </div>
      </div>

      {/* 7. Customer Also Add (Cross-sell Addon) */}
      <div className="purchase-cross-sell">
        <h3 className="purchase-cross-sell-title">Customer Also Add</h3>
        <label className="purchase-cross-sell-card">
          <input
            type="checkbox"
            className="purchase-addon-checkbox"
            checked={addPodChecked}
            onChange={(e) => setAddPodChecked(e.target.checked)}
          />

          {/* Travel pod thumbnail */}
          <div className="purchase-addon-thumb">
            <svg viewBox="0 0 40 80" className="travel-pod-svg" aria-hidden="true">
              <defs>
                <linearGradient id="podGold" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#815b34" />
                  <stop offset="50%" stopColor="#ead5ae" />
                  <stop offset="100%" stopColor="#a27c4b" />
                </linearGradient>
                <linearGradient id="podBody" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1d1a16" />
                  <stop offset="50%" stopColor="#352e26" />
                  <stop offset="100%" stopColor="#1a1714" />
                </linearGradient>
              </defs>
              {/* Outer matte espresso case with gold trim */}
              <rect x="10" y="8" width="20" height="64" rx="10" fill="url(#podBody)" stroke="rgba(170,128,80,0.4)" strokeWidth="1" />
              {/* Gold cap */}
              <rect x="12" y="4" width="16" height="8" rx="2" fill="url(#podGold)" />
              <rect x="14" y="2" width="12" height="3" rx="1" fill="#7d5830" />
              {/* Clear viewing window */}
              <rect x="16" y="26" width="8" height="26" rx="4" fill="#faf2e3" stroke="rgba(170,128,80,0.5)" strokeWidth="0.8" />
              {/* Amber fragrance juice inside */}
              <rect x="17" y="32" width="6" height="19" rx="3" fill="#ad7045" opacity="0.9" />
            </svg>
          </div>

          <div className="purchase-addon-info">
            <h4>Perfume Pod – Refillable Travel Perfume Spray Bottle</h4>
            <p>Refill anywhere. Carry it in your pocket or bag.</p>
            <span className="purchase-addon-price">
              Add for <strong>Rs. 599.00</strong>
            </span>
          </div>
        </label>
      </div>

      {/* Stock Urgency or Out of Stock Alert */}
      {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
        <div style={{ color: "#b45309", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <span>⚡ Only {product.stock} bottles left in stock — order soon</span>
        </div>
      )}
      {product.stock === 0 && (
        <div style={{ color: "#dc2626", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <span>⚠️ Currently Out of Stock</span>
        </div>
      )}

      {/* 8. Quantity & Add to Cart Action Row */}
      <div className="purchase-action-row">
        <div className="purchase-qty-picker">
          <button
            type="button"
            className="purchase-qty-btn"
            onClick={() => updateQuantity(-1)}
            disabled={product.stock === 0}
            aria-label="Decrease quantity"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <span className="purchase-qty-number">{quantity}</span>
          <button
            type="button"
            className="purchase-qty-btn"
            onClick={() => updateQuantity(1)}
            disabled={product.stock === 0 || (product.stock !== undefined && quantity >= product.stock)}
            aria-label="Increase quantity"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
        </div>

        <button
          type="button"
          className="purchase-add-to-cart-btn"
          onClick={handleAddToCart}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? (
            "Out of stock"
          ) : addedNotice ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Check size={18} /> Added to cart
            </span>
          ) : (
            "Add to cart"
          )}
        </button>
      </div>

      {/* 9. Buy It Now (With UPI Logos) */}
      <button
        type="button"
        className="purchase-buy-now-btn"
        onClick={handleBuyItNow}
        disabled={product.stock === 0}
      >
        <span>{product.stock === 0 ? "Out of Stock" : "Buy it Now"}</span>
        <div className="purchase-upi-icons" aria-hidden="true">
          {/* Paytm */}
          <span className="upi-icon paytm-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="11" fill="#002e6e" />
              <text x="12" y="16" fontSize="10" fontWeight="900" textAnchor="middle" fill="#00b9f5" fontFamily="Arial">P</text>
            </svg>
          </span>
          {/* PhonePe */}
          <span className="upi-icon phonepe-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="11" fill="#5f259f" />
              <text x="12" y="16" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#ffffff" fontFamily="Arial">पे</text>
            </svg>
          </span>
          {/* Google Pay */}
          <span className="upi-icon gpay-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="11" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" />
              <text x="12" y="16" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#4285F4" fontFamily="Arial">G</text>
            </svg>
          </span>
        </div>
      </button>

      {/* 10. Service & Trust Strip (Cancellation upto 24h | No returns | Cash on Delivery | Flovexa Assured) */}
      <div className="purchase-trust-strip">
        {/* Cancellation upto 24h */}
        <div className="trust-item">
          <div className="trust-icon-box">
            <svg viewBox="0 0 24 24" className="trust-icon" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <polyline points="12 7.5 12 12 15 12" />
              <path d="M19.5 7.5c.8 1.3 1.2 2.8 1.2 4.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <span className="trust-label">Cancellation<br />upto 24h</span>
        </div>

        {/* No returns */}
        <div className="trust-item">
          <div className="trust-icon-box">
            <svg viewBox="0 0 24 24" className="trust-icon" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.5 12a8.5 8.5 0 1 1 2.5 6" />
              <polyline points="2.5 17.5 6 18 6.5 14.5" />
              <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
              <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
            </svg>
          </div>
          <span className="trust-label">No<br />returns</span>
        </div>

        {/* Online Payment */}
        <div className="trust-item">
          <div className="trust-icon-box">
            <svg viewBox="0 0 24 24" className="trust-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="3" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <path d="M6 15h4" strokeWidth="1.8" />
              <rect x="14" y="13" width="4" height="3" rx="0.8" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <span className="trust-label">Online<br />Payment</span>
        </div>

        {/* Flovexa Assured */}
        <div className="trust-item">
          <div className="trust-icon-box">
            <svg viewBox="0 0 24 24" className="trust-icon" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2.5l7 3v6.5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V5.5l7-3z" />
              <path d="M9 12l2 2 4-4" strokeWidth="2.1" />
            </svg>
          </div>
          <span className="trust-label">Flovexa<br />Assured</span>
        </div>
      </div>
    </div>
  );
}
