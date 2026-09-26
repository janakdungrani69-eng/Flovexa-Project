import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";
import { createAdminSupabase } from "@/lib/supabase/admin";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default async function AccountPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login?next=account");
  const role = getStoreRole(user);
  if (role !== "customer") redirect(role === "admin" ? "/admin" : "/seller");

  let orders: Array<{ order_number: string; status: string; payment_status: string; total_paise: number; created_at: string; tracking_url: string | null; order_items: Array<{ product_name: string; size: string; quantity: number }> }> = [];
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.from("orders")
      .select("order_number, status, payment_status, total_paise, created_at, tracking_url, order_items(product_name, size, quantity)")
      .eq("email", (user.email ?? "").toLowerCase()).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    orders = (data ?? []) as unknown as typeof orders;
  } catch (error) {
    console.error("Could not load customer orders", error instanceof Error ? error.message : "Unknown error");
  }

  return <main className="admin-page"><header className="admin-topbar"><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><div><span>{user.email}</span><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></header>
    <section className="customer-account"><span className="eyebrow">YOUR FLOVEXA ACCOUNT</span><h1>Welcome back.</h1><p>View your purchases and follow each order from here.</p>
      <nav className="account-tabs" aria-label="Customer account"><a className="selected" href="#orders">My orders</a><span aria-disabled="true">Saved scents · Coming soon</span><span aria-disabled="true">Addresses · Coming soon</span><span aria-disabled="true">Returns · Coming soon</span></nav>
      <section id="orders" className="admin-panel account-orders"><div className="admin-panel-tools"><h2>My orders</h2><Link href="/orders">Track an order</Link></div>
        {!orders.length ? <div className="admin-empty"><b>No orders yet</b><span>Once you place an order with this email address, it will appear here.</span><Link className="primary-button" href="/#collection">Explore perfumes</Link></div> : <div className="orders-list">{orders.map((order) => <article className="order-card" key={order.order_number}><div className="order-card-head"><div><span>{order.order_number}</span><small>{new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</small></div><span className={`order-status status-${order.status}`}>{order.status.replaceAll("_", " ")}</span></div><div className="order-card-items">{order.order_items.map((item, index) => <span key={`${order.order_number}-${index}`}>{item.product_name} · {item.size} × {item.quantity}</span>)}</div><div className="account-order-bottom"><span className={`payment-pill payment-${order.payment_status}`}>{order.payment_status}</span><strong>{money(order.total_paise)}</strong>{order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer">Track shipment</a>}</div></article>)}</div>}
      </section>
    </section>
    <footer className="checkout-footer"><Link href="/">Shop Flovexa</Link><Link href="/contact">Help</Link></footer>
  </main>;
}
