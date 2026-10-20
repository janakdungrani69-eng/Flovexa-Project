"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Store, UserCheck, ArrowRight, ShieldCheck, Sparkles, LogIn } from "lucide-react";

export default function SellerAuthForm({
  userEmail,
  isCustomer,
}: {
  userEmail?: string;
  isCustomer?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");

  // Registration states
  const [storeName, setStoreName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Upgrade state (for existing customer)
  const [upgradeStoreName, setUpgradeStoreName] = useState(
    userEmail ? userEmail.split("@")[0].replace(/[^a-z0-9]/gi, " ").trim() + " Fragrances" : "My Fragrance Brand"
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function getClientSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase is not configured.");
    return createBrowserClient(url, key);
  }

  // 1. Upgrade existing customer to seller
  async function handleUpgrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/seller/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: upgradeStoreName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit seller application.");

      setSuccess("Seller application submitted! The Flovexa Store Owner must approve your account before seller access is activated.");
      setTimeout(() => {
        router.push("/seller");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit seller application.");
      setBusy(false);
    }
  }

  // 2. Register as a brand new seller (requires owner approval)
  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/seller/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");

      // Sign in with client Supabase
      const supabase = getClientSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setSuccess("Application received! Please sign in with your email and password to track your approval status.");
        setMode("login");
        setBusy(false);
        return;
      }

      setSuccess("Application received! Awaiting approval from the Flovexa Store Owner...");
      setTimeout(() => {
        router.push("/seller");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setBusy(false);
    }
  }

  // 3. Existing seller login
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
        throw new Error("Invalid merchant credentials or password. Please try again.");
      }

      const role = data.user.app_metadata?.role;
      if (role !== "seller" && role !== "admin" && role !== "owner") {
        setError("This account is registered as a buyer. Please use the 'Register as Seller' tab to start selling.");
        setBusy(false);
        return;
      }

      setSuccess("Sign-in verified! Redirecting to your dashboard...");
      setTimeout(() => {
        router.push(role === "admin" ? "/admin" : "/seller");
        router.refresh();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  // If customer is already logged in, show instant upgrade to seller
  if (isCustomer) {
    return (
      <div className="seller-auth-flow">
        <div className="seller-upgrade-box">
          <div className="seller-upgrade-header">
            <span className="seller-upgrade-pill">
              <Sparkles size={12} /> INSTANT UPGRADE
            </span>
            <h3>Start Selling on Flovexa</h3>
            <p>
              You are currently signed in as <strong>{userEmail}</strong>. Enter your brand or store name to activate your Seller Hub instantly.
            </p>
          </div>

          <form onSubmit={handleUpgrade} className="seller-quick-form">
            <label>
              Your Perfume Brand / Store Name
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={upgradeStoreName}
                onChange={(e) => setUpgradeStoreName(e.target.value)}
                placeholder="e.g. Royal Oud Atelier"
              />
            </label>

            {error && <div className="seller-form-error">{error}</div>}
            {success && <div className="seller-form-success">{success}</div>}

            <button type="submit" className="primary-button seller-submit-btn" disabled={busy}>
              <Store size={15} />
              {busy ? "Activating Seller Hub…" : "Activate Seller Hub & Manage Products"}
            </button>
          </form>

          <div className="seller-auth-alt">
            <span>Want to sign in with a different account?</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="seller-signout-link">
                Sign out of current account
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-auth-flow">
      {/* Tab Switcher: Register as Seller vs Seller Login */}
      <div className="seller-auth-tabs">
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => {
            setMode("register");
            setError("");
            setSuccess("");
          }}
        >
          <Store size={14} />
          Register as Seller
        </button>
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => {
            setMode("login");
            setError("");
            setSuccess("");
          }}
        >
          <LogIn size={14} />
          Seller Sign In
        </button>
      </div>

      {mode === "register" ? (
        <form onSubmit={handleRegister} className="seller-quick-form">
          <div className="seller-form-intro">
            <h4>Create Merchant Account</h4>
            <p>Join Flovexa as an authorized fragrance merchant partner.</p>
          </div>

          <div className="seller-form-grid">
            <label className="field-full">
              Perfume Brand / Store Name *
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Al-Noor Perfumers"
              />
            </label>

            <label className="field-full">
              Merchant Contact Name *
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </label>

            <label>
              Business Email *
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@yourbrand.com"
              />
            </label>

            <label>
              Mobile Number (10 digits) *
              <input
                type="tel"
                required
                pattern="[+\d][\d\s()-]{7,18}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>

            <label className="field-full">
              Set Seller Password (min 8 characters) *
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="inline-password-toggle"
                  onClick={() => setShowPassword((curr) => !curr)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          </div>

          {error && <div className="seller-form-error">{error}</div>}
          {success && <div className="seller-form-success">{success}</div>}

          <button type="submit" className="primary-button seller-submit-btn" disabled={busy}>
            <UserCheck size={16} />
            {busy ? "Creating Merchant Account…" : "Register as Seller & Open Dashboard"}
            <ArrowRight size={15} />
          </button>

          <p className="seller-guarantee">
            <ShieldCheck size={13} /> Free merchant listing · Direct catalogue control · 0% upfront fee
          </p>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="seller-quick-form">
          <div className="seller-form-intro">
            <h4>Merchant Hub Sign In</h4>
            <p>Access your perfume catalogue, inventory and orders.</p>
          </div>

          <label>
            Registered Merchant Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seller@yourbrand.com"
            />
          </label>

          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="inline-password-toggle"
                onClick={() => setShowPassword((curr) => !curr)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <div className="seller-form-error">{error}</div>}
          {success && <div className="seller-form-success">{success}</div>}

          <button type="submit" className="primary-button seller-submit-btn" disabled={busy}>
            <LogIn size={15} />
            {busy ? "Verifying…" : "Sign In to Seller Central"}
            <ArrowRight size={15} />
          </button>
        </form>
      )}
    </div>
  );
}
