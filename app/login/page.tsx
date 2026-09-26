import Link from "next/link";
import AdminLoginForm from "@/components/admin-login-form";

export default function LoginPage() {
  return <main className="admin-login-page"><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><section><span className="eyebrow">YOUR FLOVEXA ACCOUNT</span><h1>Welcome back.</h1><p>Sign in once. We’ll send you to the right workspace for your account.</p><AdminLoginForm /><Link className="admin-back" href="/signup">Create a customer account</Link></section><Link href="/" className="admin-back">← Return to the storefront</Link></main>;
}
