"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Gift, Sparkles } from "lucide-react";
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

  // Dynamic variations list from product
  const variants = useMemo(() => {
    if (product.variants && product.variants.length > 0) {
      return product.variants;
    }
    return [{
      id: "var-default",
      size: product.size || (isFragranceOil ? "30 ml" : "50 ml"),
      pricePaise: product.pricePaise,
      compareAtPaise: product.compareAtPaise,
      stock: product.stock ?? 10,
      imageUrl: product.imageUrl || undefined,
      images: product.images || [],
    }];
  }, [product, isFragranceOil]);

  // State
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || "var-default");
  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || variants[0];
  }, [variants, selectedVariantId]);

  // Sync selected variant with gallery & details components in real-time
  useEffect(() => {
    if (selectedVariant?.size) {
      const activeImg = selectedVariant.imageUrl || product.imageUrl || product.images?.[0];
      window.dispatchEvent(
        new CustomEvent("flovexa-select-variant", {
          detail: {
            variantId: selectedVariant.id,
            size: selectedVariant.size,
            imageUrl: activeImg,
            images: selectedVariant.images,
          },
        })
      );
    }
  }, [selectedVariant, product]);

  const [quantity, setQuantity] = useState(1);
  const [addPodChecked, setAddPodChecked] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  // Parse title cleanly to separate brand, fragrance name, and concentration
  const parsed = useMemo(() => {
    return parseProductTitle(product.name, product.concentration);
  }, [product.name, product.concentration]);

  const pricePaise = selectedVariant.pricePaise;

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

      // Add main perfume with exact size & variant
      const cartKey = `${product.id}-${selectedVariant.size}`;
      const existing = cart.find((item: any) => (item.variantId ? item.variantId === selectedVariant.id : item.productId === product.id && item.size === selectedVariant.size));
      const nextCart = existing
        ? cart.map((item: any) => (item === existing ? { ...item, quantity: item.quantity + quantity } : item))
        : [...cart, { productId: product.id, variantId: selectedVariant.id, size: selectedVariant.size, quantity }];

      // If free 10ml gift is selected, add complimentary 10ml flacon
      if (addPodChecked) {
        const giftExisting = nextCart.find((item: any) => item.productId === "free-10ml-gift");
        if (!giftExisting) {
          nextCart.push({ productId: "free-10ml-gift", size: "10 ml", quantity: 1, isGift: true });
        }
      } else {
        const filtered = nextCart.filter((item: any) => item.productId !== "free-10ml-gift");
        nextCart.length = 0;
        nextCart.push(...filtered);
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
      const checkoutItems: Array<{ productId: string; variantId?: string; size?: string; quantity: number }> = [
        { productId: product.id, variantId: selectedVariant.id, size: selectedVariant.size, quantity },
      ];
      if (addPodChecked) {
        checkoutItems.push({ productId: "free-10ml-gift", size: "10 ml", quantity: 1, isGift: true } as any);
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

      {/* 4. Dynamic Size Variations */}
      {variants.length > 1 ? (
        <div className="purchase-size-section">
          <div className="purchase-size-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Choose Bottle Size:</span>
            <strong style={{ color: "var(--accent, #aa8050)", fontSize: "14px" }}>{selectedVariant.size}</strong>
          </div>
          <div className="purchase-size-options" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
            {variants.map((v) => {
              const isSelected = v.id === selectedVariant.id;
              const isOut = false;
              const discount = v.compareAtPaise && v.compareAtPaise > v.pricePaise
                ? Math.round(((v.compareAtPaise - v.pricePaise) / v.compareAtPaise) * 100)
                : 0;

              return (
                <button
                  key={v.id}
                  type="button"
                  className={`purchase-size-btn ${isSelected ? "is-selected" : ""} ${isOut ? "is-out" : ""}`}
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    const activeImg = v.imageUrl || product.imageUrl || product.images?.[0];
                    window.dispatchEvent(
                      new CustomEvent("flovexa-select-variant", {
                        detail: {
                          variantId: v.id,
                          size: v.size,
                          imageUrl: activeImg,
                          images: v.images,
                        },
                      })
                    );
                    if (activeImg) {
                      window.dispatchEvent(new CustomEvent("flovexa-select-image", { detail: { imageUrl: activeImg } }));
                    }
                  }}
                  style={{
                    position: "relative",
                    padding: "10px 18px",
                    border: isSelected ? "2px solid #aa8050" : "1px solid #e0d7cb",
                    background: isSelected ? "#fcf9f4" : "#fff",
                    borderRadius: "6px",
                    cursor: isOut ? "not-allowed" : "pointer",
                    opacity: isOut ? 0.5 : 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: "100px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {discount > 0 && (
                    <span style={{ position: "absolute", top: "-8px", right: "-4px", background: "#3d6435", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "100px" }}>
                      {discount}% OFF
                    </span>
                  )}
                  <strong style={{ fontSize: "14px", color: isSelected ? "#1d1a16" : "#4a4237" }}>{v.size}</strong>
                  <span style={{ fontSize: "12px", color: "#8a663b", fontWeight: 600, marginTop: "2px" }}>
                    ₹{Math.round(v.pricePaise / 100)}
                  </span>
                  {v.compareAtPaise && v.compareAtPaise > v.pricePaise && (
                    <del style={{ fontSize: "10px", color: "#a59c90" }}>
                      ₹{Math.round(v.compareAtPaise / 100)}
                    </del>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="purchase-size-section" style={{ margin: "14px 0 6px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: "#6b5d4f", fontWeight: 600 }}>Bottle Size:</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 14px",
                borderRadius: "4px",
                background: "#fcf9f4",
                border: "1px solid #ebd9bf",
                color: "#aa8050",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {selectedVariant.size || product.size || "50 ml"}
            </span>
          </div>
        </div>
      )}

      {/* 5. Main Price & Strikethrough MRP */}
      <div className="purchase-main-price-row" style={{ display: "flex", alignItems: "baseline", gap: "12px", margin: "16px 0 10px" }}>
        <span className="purchase-main-price">{formattedPrice}</span>
        {selectedVariant.compareAtPaise && selectedVariant.compareAtPaise > selectedVariant.pricePaise && (
          <span style={{ fontSize: "17px", textDecoration: "line-through", color: "#92897e" }}>
            Rs. {(selectedVariant.compareAtPaise / 100).toFixed(2)}
          </span>
        )}
      </div>

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

      {/* 7. Exclusive Complimentary 10ml Perfume Gift Offer */}
      <div className="purchase-cross-sell">
        <div className="purchase-gift-header">
          <h4 className="purchase-cross-sell-title">Claim Free 10ml Luxury Perfume</h4>
          <span className="purchase-gift-badge">
            <Gift size={11} /> FREE ATELIER GIFT
          </span>
        </div>

        <label className={`purchase-cross-sell-card purchase-free-gift-card${addPodChecked ? " is-claimed" : ""}`}>
          <input
            type="checkbox"
            className="purchase-addon-checkbox"
            checked={addPodChecked}
            onChange={(e) => setAddPodChecked(e.target.checked)}
          />

          {/* Miniature 10ml luxury perfume flacon thumbnail */}
          <div className="purchase-addon-thumb">
            <svg viewBox="0 0 40 80" className="travel-pod-svg" aria-hidden="true">
              <defs>
                <linearGradient id="flaconGold" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8c6838" />
                  <stop offset="50%" stopColor="#f4e3c3" />
                  <stop offset="100%" stopColor="#aa8050" />
                </linearGradient>
                <linearGradient id="juiceGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f2c879" />
                  <stop offset="100%" stopColor="#c58938" />
                </linearGradient>
              </defs>
              <rect x="17" y="6" width="6" height="6" fill="#8c6838" rx="1" />
              <rect x="15" y="10" width="10" height="4" fill="url(#flaconGold)" rx="1" />
              <rect x="13" y="14" width="14" height="14" fill="url(#flaconGold)" rx="2" stroke="#8c6838" strokeWidth="0.5" />
              <rect x="10" y="28" width="20" height="46" rx="4" fill="#faf6f0" stroke="#bfa37e" strokeWidth="1" />
              <rect x="12" y="38" width="16" height="34" rx="3" fill="url(#juiceGold)" opacity="0.95" />
              <text x="20" y="58" fontSize="6.5" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif" letterSpacing="0.5">10 ML</text>
            </svg>
          </div>

          <div className="purchase-addon-info">
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
              <h4>Flovexa 10ml Luxury Perfume</h4>
              <span className="free-gift-pill">
                🎁 100% FREE
              </span>
            </div>
            <p>Complimentary 10ml artisanal travel spray flacon added to your parcel.</p>
            <div className="purchase-addon-price">
              <span style={{ textDecoration: "line-through", color: "#8a7e72", marginRight: "6px", fontSize: "11.5px" }}>
                Rs. 80.00
              </span>
              <strong style={{ color: "#257a3e", fontSize: "13px", fontWeight: 800 }}>
                {addPodChecked ? "✓ CLAIMED · FREE (₹0.00)" : "FREE WITH ORDER (₹0)"}
              </strong>
            </div>
          </div>
        </label>
      </div>

      {/* Continuous Atelier Hand-Bottled Freshness Assurance */}
      <div style={{ color: "#8a6639", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
        <span>⚡ Freshly hand-bottled & sealed on demand for every order</span>
      </div>

      {/* 8. Quantity & Add to Cart Action Row */}
      <div className="purchase-action-row">
        <div className="purchase-qty-picker">
          <button
            type="button"
            className="purchase-qty-btn"
            onClick={() => updateQuantity(-1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <span className="purchase-qty-number">{quantity}</span>
          <button
            type="button"
            className="purchase-qty-btn"
            onClick={() => updateQuantity(1)}
            disabled={quantity >= 50}
            aria-label="Increase quantity"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
        </div>

        <button
          type="button"
          className="purchase-add-to-cart-btn"
          onClick={handleAddToCart}
        >
          {addedNotice ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Check size={18} /> Added to cart
            </span>
          ) : (
            "Add to cart"
          )}
        </button>
      </div>

      {/* 9. Buy It Now (With Authentic Official UPI Badges) */}
      <button
        type="button"
        className="purchase-buy-now-btn"
        onClick={handleBuyItNow}
      >
        <span className="buy-now-label">Buy it Now</span>
        <div className="purchase-upi-capsule" aria-label="Accepted payments: Google Pay, PhonePe, Paytm, UPI">
          {/* 1. Official Google Pay (GPay 4-Color) */}
          <span className="purchase-upi-badge" title="Google Pay">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <circle cx="12" cy="12" r="11" fill="#ffffff" stroke="#e2ded6" strokeWidth="0.8"/>
              <path d="M18.8 12.25c0-.66-.06-1.3-.17-1.91H12v3.62h3.82c-.16.89-.67 1.64-1.42 2.15v1.79h2.3c1.35-1.24 2.1-3.07 2.1-5.65z" fill="#4285F4"/>
              <path d="M12 19.2c1.94 0 3.58-.65 4.77-1.75l-2.3-1.79c-.65.43-1.47.69-2.47.69-1.9 0-3.51-1.28-4.08-3.01H5.53v1.85C6.72 17.61 9.17 19.2 12 19.2z" fill="#34A853"/>
              <path d="M7.92 13.34c-.15-.43-.23-.89-.23-1.34s.08-.91.23-1.34V8.81H5.53C5.04 9.77 4.77 10.86 4.77 12s.27 2.23.76 3.19l2.39-1.85z" fill="#FBBC05"/>
              <path d="M12 6.77c1.06 0 2.01.36 2.76 1.08l2.07-2.07C15.58 4.6 13.94 4 12 4 9.17 4 6.72 5.59 5.53 8.01l2.39 1.85c.57-1.73 2.18-3.09 4.08-3.09z" fill="#EA4335"/>
            </svg>
          </span>

          {/* 2. Official PhonePe (Royal Purple with Authentic 'पे') */}
          <span className="purchase-upi-badge" title="PhonePe">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <circle cx="12" cy="12" r="11" fill="#5f259f"/>
              <rect x="6.2" y="7.2" width="11.6" height="1.8" rx="0.9" fill="#ffffff"/>
              <rect x="14" y="7.2" width="1.8" height="9.8" rx="0.9" fill="#ffffff"/>
              <path d="M8.2 8.2v3.8c0 1.6 1.3 2.9 2.9 2.9h2.9v-1.8h-2.9c-.6 0-1.1-.5-1.1-1.1V8.2H8.2z" fill="#ffffff"/>
              <path d="M14.2 7.6c-.3-1.6-1.5-3-3.2-3.8-.4-.2-.8 0-1 .4-.2.4 0 .8.4 1 1.2.6 2 1.6 2.2 2.6l1.6-.2z" fill="#ffffff"/>
            </svg>
          </span>

          {/* 3. Official Paytm (Navy Circle with White Pay & Cyan tm) */}
          <span className="purchase-upi-badge" title="Paytm">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <circle cx="12" cy="12" r="11" fill="#002970"/>
              <text x="4.8" y="14.2" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" fontWeight="900" fontSize="7.5" fill="#ffffff" letterSpacing="-0.2">Pay</text>
              <text x="13.8" y="14.2" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" fontWeight="900" fontSize="7.5" fill="#00baf2" letterSpacing="-0.2">tm</text>
            </svg>
          </span>

          {/* 4. Official NPCI UPI Chevron */}
          <span className="purchase-upi-badge" title="Instant UPI">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <circle cx="12" cy="12" r="11" fill="#ffffff" stroke="#e2ded6" strokeWidth="0.8"/>
              <polygon points="9.5,8 14.5,12 9.5,16" fill="#097939"/>
              <polygon points="12.5,8 17.5,12 12.5,16" fill="#ed5e29"/>
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
