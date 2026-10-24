import Link from "next/link";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin-login-form";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Sign in — Flovexa Perfumes");

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const { next } = (await searchParams) ?? {};

  // If already logged in, never ask to sign in again — send immediately to destination or store!
  const user = await getSignedInUser();
  if (user) {
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      redirect(next);
    }
    const role = getStoreRole(user);
    if (role === "admin") redirect("/admin");
    if (role === "seller") redirect("/seller");
    redirect("/store");
  }

  const registerHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

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
        <Link href={registerHref} style={{ fontSize: "12px", color: "#aa8050", fontWeight: 600, textDecoration: "underline" }}>
          Register for access here →
        </Link>
      </div>
    </main>
  );
}
