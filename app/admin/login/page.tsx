import Link from "next/link";
import AdminLoginForm from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return <main className="admin-login-page"><Link href="/" className="wordmark">FLOVEXA<span>PARFUMS</span></Link><section><span className="eyebrow">STORE MANAGEMENT</span><h1>Welcome back.</h1><p>Sign in with your authorized store administrator account.</p><AdminLoginForm /></section><Link href="/" className="admin-back">← Return to the storefront</Link></main>;
}
