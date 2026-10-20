import Link from "next/link";
import SignupForm from "@/components/signup-form";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Customer Registration — Flovexa Perfumes");

export default function SignupPage() {
  return (
    <main className="admin-login-page">
      <div className="wordmark">
        FLOVEXA<span>PERFUMES</span>
      </div>
      <section>
        <span className="eyebrow">EXCLUSIVE ACCESS</span>
        <h1>Welcome to Flovexa.</h1>
        <p>Please register your customer account to explore our luxury fragrances, discover notes, and place orders.</p>
        <SignupForm />
      </section>
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <span style={{ fontSize: "12px", color: "var(--muted, #777066)" }}>Already registered? </span>
        <Link href="/login" style={{ fontSize: "12px", color: "#aa8050", fontWeight: 600, textDecoration: "underline" }}>
          Sign in here →
        </Link>
      </div>
    </main>
  );
}
