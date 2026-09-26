import Link from "next/link";
import SignupForm from "@/components/signup-form";

export default function SignupPage() {
  return <main className="admin-login-page"><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><section><span className="eyebrow">CUSTOMER ACCOUNT</span><h1>Your scent story.</h1><p>Create an account to keep your Flovexa orders together.</p><SignupForm /></section><Link href="/" className="admin-back">← Return to the storefront</Link></main>;
}
