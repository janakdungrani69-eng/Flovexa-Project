"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) { setError("Customer accounts are not configured yet."); setBusy(false); return; }
    const supabase = createBrowserClient(url, key);
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signupError) { setError(signupError.message); setBusy(false); return; }
    if (data.session) router.replace("/account");
    else setMessage("Check your email to confirm your account, then sign in to continue.");
    setBusy(false);
  }

  return <form className="admin-login-form" onSubmit={submit}>
    <label>Full name<input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <button className="primary-button" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
    <Link className="admin-back" href="/login">Already have an account? Sign in</Link>
  </form>;
}
