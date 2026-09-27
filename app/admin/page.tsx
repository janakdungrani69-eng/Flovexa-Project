import Link from "next/link";
import { redirect } from "next/navigation";
import AdminDashboard, { type AdminOrder, type AdminProduct, type AdminReturnRequest } from "@/components/admin-dashboard";
import { getAdminUser } from "@/lib/supabase/admin-user";
import { createAdminSupabase } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  let products: AdminProduct[] = [];
  let orders: AdminOrder[] = [];
  let returnRequests: AdminReturnRequest[] = [];
  try {
    const supabase = createAdminSupabase();
    const [productResult, orderResult, returnResult] = await Promise.all([
      supabase.from("products").select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, stock, featured, active, created_at").order("created_at", { ascending: false }),
      supabase.from("orders").select("id, order_number, customer_name, email, phone, shipping_address, total_paise, status, payment_status, tracking_carrier, tracking_number, tracking_url, created_at, order_items(product_name, size, quantity)").order("created_at", { ascending: false }).limit(50),
      supabase.from("return_requests").select("id, order_id, user_id, reason, details, status, created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (productResult.data) products = productResult.data.map((item) => ({ id: item.id, slug: item.slug, name: item.name, category: item.category, pricePaise: item.price_paise, compareAtPaise: item.compare_at_paise ?? undefined, size: item.size, concentration: item.concentration, notes: item.notes, description: item.description, imageUrl: item.image_url, accent: item.accent, stock: item.stock, featured: item.featured, active: item.active, createdAt: item.created_at }));
    if (orderResult.data) orders = orderResult.data as unknown as AdminOrder[];
    if (returnResult.data?.length) {
      const returnOrderIds = [...new Set(returnResult.data.map((item) => item.order_id))];
      const known = new Map(orders.map((order) => [order.id, order]));
      const missingIds = returnOrderIds.filter((id) => !known.has(id));
      if (missingIds.length) {
        const { data } = await supabase.from("orders").select("id, order_number, customer_name, email, total_paise").in("id", missingIds);
        for (const order of data ?? []) known.set(order.id, order as typeof orders[number]);
      }
      returnRequests = returnResult.data.map((item) => ({ ...item, order: known.get(item.order_id) ?? null }));
    }
  } catch (error) { console.error("Could not load store admin data", error instanceof Error ? error.message : "Unknown error"); }
  return <main className="admin-page"><header className="admin-topbar"><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><div><span>{user.email}</span><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></header><AdminDashboard products={products} orders={orders} returnRequests={returnRequests} /></main>;
}
