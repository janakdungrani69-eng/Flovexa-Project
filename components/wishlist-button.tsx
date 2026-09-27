"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

export default function WishlistButton({ productId, initialSaved = false, onSavedChange, checkSaved = false }: { productId: string; initialSaved?: boolean; onSavedChange?: (saved: boolean) => void; checkSaved?: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!checkSaved) return;
    let active = true;
    fetch("/api/account/wishlist", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      if (active && Array.isArray(result.productIds)) setSaved(result.productIds.includes(productId));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [checkSaved, productId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/account/wishlist", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const result = await response.json();
      if (response.status === 401) {
        sessionStorage.setItem("flovexa-pending-wishlist", productId);
        router.push("/login");
        return;
      }
      if (!response.ok) return;
      const nextSaved = Boolean(result.saved);
      setSaved(nextSaved); onSavedChange?.(nextSaved);
    } catch { /* Keep the current saved state when the request cannot reach the account API. */ }
    finally { setBusy(false); }
  }

  return <button type="button" className={`wishlist-button${saved ? " is-saved" : ""}`} aria-label={saved ? "Remove from saved perfumes" : "Save this perfume"} aria-pressed={saved} disabled={busy} onClick={() => void toggle()}><Heart size={15} fill={saved ? "currentColor" : "none"}/><span>{saved ? "Saved" : "Save"}</span></button>;
}
