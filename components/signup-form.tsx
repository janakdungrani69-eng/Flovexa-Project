"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Check, Mail, ShieldCheck } from "lucide-react";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("male");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP states
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Timer countdown for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((current) => current - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  async function handleSendOtp() {
    setError("");
    setMessage("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address first.");
      return;
    }

    setSendingOtp(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not send the secret code.");
      }

      setOtpSent(true);
      setOtpVerified(false);
      setResendCooldown(60);
      setOtp("");
      setMessage(data.message ?? `A secret code (OTP) has been sent to ${trimmedEmail}.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send verification code.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setMessage("");

    const trimmedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the 6-digit secret code sent to your email.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, otp: cleanOtp }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Invalid verification code.");
      }

      setOtpVerified(true);
      setMessage("Email verified successfully! You can now create your account.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verification code is invalid or expired.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!otpVerified) {
      setError("Please verify your email address using the secret code (OTP) first.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setBusy(true);
    const trimmedEmail = email.trim().toLowerCase();

    try {
      // Step 1: Register customer on server
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          phone: phone.trim(),
          gender,
          email: trimmedEmail,
          password,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Could not create account.");
      }

      // Step 2: Sign in immediately with email & password
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (url && key) {
        const supabase = createBrowserClient(url, key);
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (!loginError) {
          const params = new URLSearchParams(window.location.search);
          const next = params.get("next");
          const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/store";
          router.replace(target);
          router.refresh();
          return;
        }
      }

      setMessage("Account created successfully! Redirecting to sign in…");
      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        const target = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
        router.replace(target);
      }, 1200);
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label>
        Full name
        <input
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Rohini Sharma"
        />
      </label>

      <label>
        Mobile number
        <input
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+91 98765 43210"
        />
      </label>

      <label>
        Gender
        <select value={gender} onChange={(event) => setGender(event.target.value)}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </label>

      {/* Email Address with OTP Send Button */}
      <label>
        Email address
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="email"
            autoComplete="email"
            required
            disabled={otpVerified}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setOtpSent(false);
              setOtpVerified(false);
            }}
            placeholder="yourname@domain.com"
            style={{ flex: 1 }}
          />
          {!otpVerified ? (
            <button
              type="button"
              className="inline-password-toggle"
              disabled={sendingOtp || !email.trim() || resendCooldown > 0}
              onClick={() => void handleSendOtp()}
              style={{
                minWidth: "115px",
                height: "43px",
                cursor: sendingOtp || resendCooldown > 0 ? "not-allowed" : "pointer",
                background: "#241f19",
                color: "#f5f2eb",
              }}
            >
              {sendingOtp
                ? "Sending…"
                : resendCooldown > 0
                ? `${resendCooldown}s`
                : otpSent
                ? "Resend code"
                : "Send OTP"}
            </button>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "0 12px",
                background: "#e4eadc",
                color: "#4d6142",
                fontSize: "10px",
                fontWeight: 600,
                borderRadius: "2px",
              }}
            >
              <Check size={14} /> Verified
            </div>
          )}
        </div>
      </label>

      {/* Secret OTP Verification section */}
      {otpSent && !otpVerified && (
        <div
          style={{
            padding: "14px",
            background: "#f4eee2",
            border: "1px solid #dcd1bf",
            borderRadius: "2px",
            display: "grid",
            gap: "9px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8a6b47", fontSize: "10px", fontWeight: 600 }}>
            <Mail size={13} />
            <span>ENTER 6-DIGIT SECRET CODE SENT TO EMAIL</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              placeholder="······"
              style={{
                flex: 1,
                letterSpacing: "6px",
                fontFamily: "monospace",
                fontSize: "16px",
                fontWeight: "bold",
                textAlign: "center",
              }}
            />
            <button
              type="button"
              className="inline-password-toggle"
              disabled={verifyingOtp || otp.length !== 6}
              onClick={() => void handleVerifyOtp()}
              style={{
                minWidth: "105px",
                background: "#aa8050",
                color: "#fff",
                cursor: verifyingOtp || otp.length !== 6 ? "not-allowed" : "pointer",
              }}
            >
              {verifyingOtp ? "Checking…" : "Verify code"}
            </button>
          </div>
          <small style={{ color: "#7a7266", fontSize: "9px" }}>
            Please open your Gmail inbox or spam folder and enter the 6-digit code sent to your email.
          </small>

        </div>
      )}

      {/* Password Field (Used for future logins: Email + Password) */}
      <label>
        Create a password
        <small style={{ color: "#8b8377", fontSize: "8px", fontWeight: "normal" }}>
          (You will use this password and your email to log in next time)
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

      {error && <p role="alert" style={{ color: "#a24336", margin: "4px 0 0", fontSize: "10px" }}>{error}</p>}
      {message && <p role="status" style={{ color: "#456338", margin: "4px 0 0", fontSize: "10px" }}>{message}</p>}

      <button
        className="primary-button"
        disabled={busy || !otpVerified}
        style={{
          marginTop: "10px",
          opacity: busy || !otpVerified ? 0.6 : 1,
          cursor: busy || !otpVerified ? "not-allowed" : "pointer",
        }}
      >
        <ShieldCheck size={16} />
        {busy ? "Creating account…" : "Register & Enter Storefront"}
      </button>

      <div style={{ textAlign: "center", marginTop: "14px", borderTop: "1px solid rgba(29,26,22,0.1)", paddingTop: "14px" }}>
        <span style={{ fontSize: "11px", color: "#777066" }}>Already registered? </span>
        <Link href="/login" style={{ fontSize: "11px", color: "#aa8050", fontWeight: 600, textDecoration: "underline" }}>
          Sign in to your account
        </Link>
      </div>
    </form>
  );
}
