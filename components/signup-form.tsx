"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { ShieldCheck, UserPlus, CheckCircle2 } from "lucide-react";

export default function SignupForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("male");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nextUrl, setNextUrl] = useState("/store");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      setNextUrl(next);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!trimmedPhone) {
      setError("Please enter your mobile number.");
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setBusy(true);

    try {
      // 1. Create account on server
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          phone: trimmedPhone,
          gender,
          email: trimmedEmail,
          password,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Could not create account.");
      }

      // 2. Sign in immediately with email & password
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (url && key) {
        const supabase = createBrowserClient(url, key);
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
      }

      setMessage("Account created successfully! Entering Flovexa storefront…");

      // 3. Navigate into storefront
      setTimeout(() => {
        window.location.href = nextUrl;
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setBusy(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label>
        Full name
        <input
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Dungrani Janak"
        />
      </label>

      <label>
        Mobile number
        <input
          type="tel"
          required
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+91 96627 65757"
        />
      </label>

      <label>
        Gender
        <select
          value={gender}
          onChange={(event) => setGender(event.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#fff",
            border: "1px solid #dcd3c5",
            borderRadius: "4px",
            fontSize: "13px",
            color: "#221d17",
          }}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </label>

      <label>
        Email address
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@gmail.com"
        />
      </label>

      <label>
        Create a password
        <small style={{ color: "#8b8377", fontSize: "11px", fontWeight: "normal" }}>
          (Use this password to log in next time)
        </small>
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            className="inline-password-toggle"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {error && (
        <p role="alert" style={{ color: "#a24336", margin: "6px 0 0", fontSize: "12px" }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: "#2e7d32", margin: "6px 0 0", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <CheckCircle2 size={15} />
          {message}
        </p>
      )}

      <button
        type="submit"
        className="primary-button"
        disabled={busy}
        style={{
          marginTop: "14px",
          width: "100%",
          padding: "12px",
          background: "#241f19",
          color: "#fff",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "1px",
          textTransform: "uppercase",
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <ShieldCheck size={16} />
        {busy ? "Creating account…" : "Register & Enter Storefront"}
      </button>

      <div style={{ textAlign: "center", marginTop: "16px", borderTop: "1px solid rgba(29,26,22,0.1)", paddingTop: "14px" }}>
        <span style={{ fontSize: "12px", color: "#777066" }}>Already registered? </span>
        <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} style={{ fontSize: "12px", color: "#aa8050", fontWeight: 600, textDecoration: "underline" }}>
          Sign in with Email & Password →
        </Link>
      </div>
    </form>
  );
}
