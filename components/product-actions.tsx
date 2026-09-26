"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/products";

export default function ProductActions({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  function addToBag() {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem("flovexa-cart") ?? "[]");
      const cart = Array.isArray(stored) ? stored as { productId: string; quantity: number }[] : [];
      const existing = cart.find((item) => item.productId === product.id);
      const next = existing
        ? cart.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item)
        : [...cart, { productId: product.id, quantity }];
      localStorage.setItem("flovexa-cart", JSON.stringify(next));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2200);
    } catch { setAdded(false); }
  }
  return <div className="detail-actions"><div className="detail-quantity"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => setQuantity((value) => Math.min(20, value + 1))} aria-label="Increase quantity"><Plus size={15} /></button></div><button className="primary-button detail-add" onClick={addToBag}>{added ? <><Check size={17} /> Added to your bag</> : <><ShoppingBag size={17} /> Add to bag</>}</button></div>;
}
