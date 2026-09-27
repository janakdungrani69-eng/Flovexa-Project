import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";
import CustomerAccount from "@/components/customer-account";

export default async function AccountPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login?next=account");
  const role = getStoreRole(user);
  if (role !== "customer") redirect(role === "admin" ? "/admin" : "/seller");

  return <main className="admin-page"><header className="admin-topbar"><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><div><span>{user.email}</span><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></header>
    <CustomerAccount email={user.email ?? ""} />
    <footer className="checkout-footer"><Link href="/">Shop Flovexa</Link><Link href="/contact">Help</Link></footer>
  </main>;
}
