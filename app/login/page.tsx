import Link from "next/link";
import AdminLoginForm from "@/components/admin-login-form";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Sign in — Flovexa Perfumes");

export default function LoginPage() {
  return (
    <main className="admin-login-page">
      <div className="wordmark">
        FLOVEXA<span>PERFUMES</span>
      </div>
      <section>
        <span className="eyebrow">YOUR FLOVEXA ACCOUNT</span>
        <h1>Welcome back.</h1>
        <p>Sign in with your email and password to access the store and your orders.</p>
        <AdminLoginForm />
      </section>
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <span style={{ fontSize: "12px", color: "var(--muted, #777066)" }}>New customer? </span>
        <Link href="/signup" style={{ fontSize: "12px", color: "#aa8050", fontWeight: 600, textDecoration: "underline" }}>
          Register for access here →
        </Link>
      </div>
    </main>
  );
}
