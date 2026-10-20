"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

export default function WishlistButton({
  productId,
  initialSaved = false,
  onSavedChange,
  checkSaved = false,
}: {
  productId: string;
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  checkSaved?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Check localStorage first
    try {
      const stored = localStorage.getItem("flovexa-wishlist");
      if (stored) {
        const list: string[] = JSON.parse(stored);
        if (Array.isArray(list) && list.includes(productId)) {
          setSaved(true);
        }
      }
    } catch {}

    if (!checkSaved) return;
    let active = true;
    fetch("/api/account/wishlist", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        if (active && Array.isArray(result.productIds)) {
          const isSavedInDb = result.productIds.includes(productId);
          setSaved(isSavedInDb);
          try {
            const stored = localStorage.getItem("flovexa-wishlist");
            const localList: string[] = stored ? JSON.parse(stored) : [];
            const merged = Array.from(new Set([...localList, ...result.productIds]));
            localStorage.setItem("flovexa-wishlist", JSON.stringify(merged));
          } catch {}
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [checkSaved, productId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const nextSaved = !saved;
    setSaved(nextSaved);
    onSavedChange?.(nextSaved);

    // Persist locally immediately
    try {
      const stored = localStorage.getItem("flovexa-wishlist");
      const list: string[] = stored ? JSON.parse(stored) : [];
      const updated = nextSaved
        ? Array.from(new Set([...list, productId]))
        : list.filter((id) => id !== productId);
      localStorage.setItem("flovexa-wishlist", JSON.stringify(updated));
    } catch {}

    try {
      const response = await fetch("/api/account/wishlist", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (response.status === 401) {
        // Keep in pending wishlist for whenever user signs into account later
        if (nextSaved) {
          sessionStorage.setItem("flovexa-pending-wishlist", productId);
        }
        return;
      }
      if (!response.ok) return;
      const result = await response.json();
      if (typeof result.saved === "boolean") {
        setSaved(result.saved);
        onSavedChange?.(result.saved);
      }
    } catch {
      // Keep optimistic local state
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`wishlist-button${saved ? " is-saved" : ""}`}
      aria-label={saved ? "Remove from saved perfumes" : "Save this perfume"}
      aria-pressed={saved}
      disabled={busy}
      onClick={() => void toggle()}
    >
      <Heart size={15} fill={saved ? "currentColor" : "none"} />
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
