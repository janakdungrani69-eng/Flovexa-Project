"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signupUrl, setSignupUrl] = useState("/signup");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      setSignupUrl(`/signup?next=${encodeURIComponent(next)}`);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      setError("Sign-in is not configured yet.");
      setBusy(false);
      return;
    }

    const supabase = createBrowserClient(url, key);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError || !data.user) {
      if (data.user) await supabase.auth.signOut();
      setError("No account found for this email, or the password is incorrect. Please register first.");
      setBusy(false);
      return;
    }

    const role = data.user.app_metadata?.role;
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (next && next.startsWith("/") && !next.startsWith("//")) {
      router.replace(next);
    } else if (window.location.pathname.startsWith("/admin") && (role === "admin" || role === "owner")) {
      router.replace("/admin");
    } else {
      router.replace("/store");
    }
    router.refresh();
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>
        Email address
        <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>

      <label>
        Password
        <div className="password-field">
          <input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="button" className="inline-password-toggle" onClick={() => setShowPassword((current) => !current)}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {error && <p role="alert">{error}</p>}

      {error && (
        <Link href={signupUrl} className="admin-back" style={{ display: "inline-block", marginTop: "-6px" }}>
          Register account
        </Link>
      )}

      <button className="primary-button" disabled={busy}>
        {busy ? "Signing in…" : "Sign in with Email & Password"}
      </button>

      <div style={{ textAlign: "center", marginTop: "12px", borderTop: "1px solid rgba(29,26,22,0.1)", paddingTop: "14px" }}>
        <span style={{ fontSize: "11px", color: "#777066" }}>New customer? </span>
        <Link href={signupUrl} style={{ fontSize: "11px", color: "#aa8050", fontWeight: 600, textDecoration: "underline" }}>
          Register for exclusive access
        </Link>
      </div>
    </form>
  );
}
