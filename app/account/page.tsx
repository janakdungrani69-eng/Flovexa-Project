import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/supabase/roles";
import CustomerAccount from "@/components/customer-account";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("My Account & Orders — Flovexa");

export default async function AccountPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login?next=/account");

  return (
    <main className="customer-portal-page">
      <header className="customer-portal-topbar">
        <div className="customer-portal-topbar-inner">
          <Link href="/store" className="wordmark" aria-label="Flovexa Perfumes Home">
            FLOVEXA<span>PERFUMES</span>
          </Link>
          <div className="customer-portal-actions">
            <Link href="/store" className="customer-portal-back-btn">
              ← Return to Storefront
            </Link>
            <span className="customer-portal-email-tag">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="customer-portal-signout-btn">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="customer-portal-content-wrap">
        <CustomerAccount email={user.email ?? ""} />
      </div>

      <footer className="checkout-footer">
        <Link href="/store">Return to Storefront</Link>
        <Link href="/contact">Help & Support</Link>
      </footer>
    </main>
  );
}
