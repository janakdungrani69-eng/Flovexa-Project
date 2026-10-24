import Link from "next/link";
import { redirect } from "next/navigation";
import SignupForm from "@/components/signup-form";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Customer Registration — Flovexa Perfumes");

export default async function SignupPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const { next } = (await searchParams) ?? {};

  // If already logged in, never ask to register again — send immediately to destination or store!
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

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

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
        <Link href={loginHref} style={{ fontSize: "12px", color: "#aa8050", fontWeight: 600, textDecoration: "underline" }}>
          Sign in here →
        </Link>
      </div>
    </main>
  );
}
