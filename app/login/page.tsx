import Link from "next/link";
import AdminLoginForm from "@/components/admin-login-form";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Sign in");

export default function LoginPage() {
  return (
    <main className="admin-login-page">
      <Link href="/store" className="wordmark">
        FLOVEXA<span>PERFUMES</span>
      </Link>
      <section>
        <span className="eyebrow">YOUR FLOVEXA ACCOUNT</span>
        <h1>Welcome back.</h1>
        <p>Sign in with your email and password to access your orders and account.</p>
        <AdminLoginForm />
      </section>
      <Link href="/store" className="admin-back" style={{ marginTop: "20px" }}>
        ← Return to the storefront
      </Link>
    </main>
  );
}
