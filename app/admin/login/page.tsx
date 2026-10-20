import Link from "next/link";
import AdminLoginForm from "@/components/admin-login-form";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Admin sign in");

export default function AdminLoginPage() {
  return <main className="admin-login-page"><Link href="/store" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><section><span className="eyebrow">FLOVEXA ACCOUNT</span><h1>Welcome back.</h1><p>Sign in once. We’ll send you to the right workspace for your account.</p><AdminLoginForm /><Link className="admin-back" href="/signup">Create a customer account</Link></section><Link href="/store" className="admin-back">← Return to the storefront</Link></main>;
}
