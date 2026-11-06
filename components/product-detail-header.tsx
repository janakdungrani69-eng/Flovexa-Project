"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import CheckoutBackButton from "@/components/checkout-back-button";
import type { Product } from "@/lib/products";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

interface CartItem {
  productId: string;
  variantId?: string;
  size?: string;
  quantity: number;
}

export default function ProductDetailHeader({
  currentProduct,
  allProducts,
}: {
  currentProduct: Product;
  allProducts?: Product[];
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Sync cart from localStorage
  const syncCart = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("flovexa-cart") ?? "[]");
      if (Array.isArray(stored)) {
        setCart(stored);
      }
    } catch {
      setCart([]);
    }
  };

  useEffect(() => {
    syncCart();

    const handleStorage = () => syncCart();
    const handleCartUpdated = (e: Event) => {
      syncCart();
      const custom = e as CustomEvent<{ openDrawer?: boolean }>;
      if (custom.detail?.openDrawer) {
        setCartOpen(true);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("flovexa-cart-updated", handleCartUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("flovexa-cart-updated", handleCartUpdated);
    };
  }, []);

  const cartQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cart]);

  // Catalog products map
  const productCatalog = useMemo(() => {
    const list = allProducts && allProducts.length > 0 ? allProducts : [currentProduct];
    return new Map(list.map((p) => [p.id, p]));
  }, [allProducts, currentProduct]);

  // Resolved cart items
  const cartLines = useMemo(() => {
    return cart
      .map((item) => {
        const prod = productCatalog.get(item.productId) || (item.productId === currentProduct.id ? currentProduct : null);
        if (!prod) return null;

        const variant = prod.variants?.find((v) => (item.variantId && v.id === item.variantId) || (item.size && v.size === item.size));
        const price = variant ? variant.pricePaise : prod.pricePaise;
        const size = variant ? variant.size : item.size || prod.size;
        const image = variant?.imageUrl || prod.imageUrl || prod.images?.[0];

        return {
          ...item,
          product: prod,
          size,
          pricePaise: price,
          image,
        };
      })
      .filter((l): l is NonNullable<typeof l> => Boolean(l));
  }, [cart, productCatalog, currentProduct]);

  const cartTotal = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.pricePaise * line.quantity, 0);
  }, [cartLines]);

  const updateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
    const next = cart
      .map((item) => {
        const match = item.productId === productId && (variantId ? item.variantId === variantId : true);
        if (match) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter((i): i is CartItem => Boolean(i));

    setCart(next);
    localStorage.setItem("flovexa-cart", JSON.stringify(next));
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <>
      <header className="checkout-header detail-header">
        <CheckoutBackButton label="Go back" fallback="/store#collection" />
        <Link href="/" className="wordmark" aria-label="Flovexa Perfumes home">
          FLOVEXA<span>PERFUMES</span>
        </Link>
        <button
          type="button"
          className="detail-bag-btn"
          onClick={() => setCartOpen(true)}
          aria-label={`Open shopping bag, ${cartQuantity} items`}
        >
          <ShoppingBag size={17} strokeWidth={1.8} />
          <span>Bag</span>
          <b>{cartQuantity}</b>
        </button>
      </header>

      {/* Slide-over Cart Drawer on Product Page */}
      <div
        className={`drawer-scrim${cartOpen ? " is-visible" : ""}`}
        onClick={() => setCartOpen(false)}
      />
      <aside
        className={`cart-drawer${cartOpen ? " is-open" : ""}`}
        aria-label="Shopping bag"
        aria-hidden={!cartOpen}
      >
        <div className="drawer-heading">
          <div>
            <span className="eyebrow">YOUR SELECTION</span>
            <h2>
              Your bag <small>({cartQuantity})</small>
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setCartOpen(false)}
            aria-label="Close bag"
          >
            <X size={21} />
          </button>
        </div>

        {cartLines.length > 0 ? (
          <>
            <div className="drawer-items">
              {cartLines.map((line) => (
                <div className="drawer-item" key={`${line.productId}-${line.size}`}>
                  <div className="drawer-thumb" style={{ position: "relative" }}>
                    {line.image ? (
                      <img
                        src={line.image}
                        alt={line.product.name}
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ebe1" }}>
                        <ShoppingBag size={24} color="#aa8050" />
                      </div>
                    )}
                  </div>
                  <div className="drawer-item-copy">
                    <span>{line.product.category}</span>
                    <h3>{line.product.name}</h3>
                    <small>{line.size} · {line.product.concentration || "Artisanal Perfume"}</small>
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.productId, line.variantId, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.productId, line.variantId, 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <strong>{money(line.pricePaise * line.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="drawer-summary">
              <div>
                <span>Subtotal</span>
                <strong>{money(cartTotal)}</strong>
              </div>
              <small>Free express shipping & taxes included.</small>
              <Link
                className="primary-button checkout-link"
                href={`/checkout?items=${encodeURIComponent(JSON.stringify(cart))}`}
                prefetch={true}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  height: "50px",
                  background: "#241f19",
                  color: "#f5f2eb",
                  fontWeight: 700,
                  fontSize: "13px",
                  borderRadius: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  marginTop: "14px",
                }}
              >
                Proceed to Checkout <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                className="continue-shopping"
                onClick={() => setCartOpen(false)}
                style={{ marginTop: "10px", background: "none", border: "none", cursor: "pointer", color: "#777066", fontSize: "11px" }}
              >
                Continue browsing
              </button>
            </div>
          </>
        ) : (
          <div className="empty-bag">
            <span className="empty-bag-icon">
              <ShoppingBag size={24} />
            </span>
            <h3>Your bag is empty</h3>
            <p>Select a fragrance size and add it to your bag.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setCartOpen(false)}
            >
              Back to fragrance <ArrowRight size={16} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

