import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";

export default async function SellerPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login?next=seller");
  const role = getStoreRole(user);
  if (role !== "seller") redirect(role === "admin" ? "/admin" : "/account");

  return <main className="admin-page"><header className="admin-topbar"><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><div><span>{user.email}</span><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></header>
    <section className="customer-account"><span className="eyebrow">FLOVEXA SELLER PORTAL</span><h1>Your seller space.</h1><p>This account has the seller role. The current store is configured for Flovexa-owned products; seller catalogues, order assignments and settlements need to be enabled before marketplace sales begin.</p>
      <div className="seller-portal-notice"><b>Seller tools are being prepared.</b><span>When marketplace operations are enabled, your panel will include your perfumes, stock, assigned orders, returns and earnings. Seller access cannot see the owner dashboard.</span><Link href="/contact">Contact the store owner</Link></div>
    </section>
    <footer className="checkout-footer"><Link href="/">Shop Flovexa</Link></footer>
  </main>;
}
