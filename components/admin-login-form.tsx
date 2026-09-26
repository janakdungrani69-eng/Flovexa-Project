"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) { setError("Admin sign-in is not configured yet."); setBusy(false); return; }
    const supabase = createBrowserClient(url, key);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || data.user?.app_metadata?.role !== "admin") {
      if (data.user) await supabase.auth.signOut();
      setError(loginError?.message ?? "This account is not authorized to manage the store."); setBusy(false); return;
    }
    router.replace("/admin"); router.refresh();
  }
  return <form className="admin-login-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button></form>;
}
