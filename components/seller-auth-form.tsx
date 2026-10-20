"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Store, LogIn, ShieldAlert } from "lucide-react";

export default function SellerAuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function getClientSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase is not configured.");
    return createBrowserClient(url, key);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = getClientSupabase();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        throw new Error("Invalid seller email or password. Please verify your credentials.");
      }

      const role = data.user.app_metadata?.role;
      if (role !== "seller" && role !== "admin" && role !== "owner") {
        await supabase.auth.signOut();
        setError("Access denied. Public seller registration is closed. Only authorized Flovexa merchants can access this portal.");
        setBusy(false);
        return;
      }

      setSuccess("Credentials verified. Redirecting to your merchant dashboard...");
      setTimeout(() => {
        router.push(role === "admin" ? "/admin" : "/seller");
        router.refresh();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="seller-auth-flow">
      <form onSubmit={handleLogin} className="seller-quick-form">
        <div className="seller-form-intro">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f8f3ea", border: "1px solid #d4c2a5", padding: "4px 10px", borderRadius: "100px", fontSize: "11px", color: "#8a663b", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
            <Store size={12} /> Authorized Merchant Access Only
          </div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#221d17", margin: "4px 0 6px" }}>
            Seller Central Sign In
          </h3>
          <p style={{ fontSize: "13px", color: "#776d60", margin: 0 }}>
            Sign in with your authorized Flovexa seller credentials to manage your perfume catalog, pricing, and orders.
          </p>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#362f27" }}>
          Seller Email Address
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="janakdungrani69@gmail.com"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #dcd3c5", borderRadius: "4px", fontSize: "14px" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#362f27" }}>
          Seller Password
          <div className="password-field" style={{ position: "relative", display: "flex" }}>
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #dcd3c5", borderRadius: "4px", fontSize: "14px" }}
            />
            <button
              type="button"
              className="inline-password-toggle"
              onClick={() => setShowPassword((curr) => !curr)}
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#8a663b", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error && (
          <div className="seller-form-error" style={{ background: "#fbeeed", border: "1px solid #e8a9a2", color: "#a23c31", padding: "10px 12px", borderRadius: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="seller-form-success" style={{ background: "#edf6ea", border: "1px solid #a8d59d", color: "#3a6f2c", padding: "10px 12px", borderRadius: "4px", fontSize: "12px" }}>
            {success}
          </div>
        )}

        <button
          type="submit"
          className="primary-button seller-submit-btn"
          disabled={busy}
          style={{ width: "100%", padding: "12px", background: "#201c18", color: "#fff", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <LogIn size={15} />
          {busy ? "Verifying Credentials…" : "Sign In to Seller Central"}
        </button>

        <p style={{ fontSize: "11px", color: "#8c8273", textAlign: "center", margin: "8px 0 0" }}>
          Private Portal: Registration is restricted to verified Flovexa partners.
        </p>
      </form>
    </div>
  );
}
