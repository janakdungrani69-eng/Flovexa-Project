import Link from "next/link";
import { redirect } from "next/navigation";
import AdminDashboard, { type AdminOrder, type AdminProduct, type AdminReturnRequest } from "@/components/admin-dashboard";
import type { AdminCustomer } from "@/components/admin-customers";
import type { AdminReportOrder } from "@/components/admin-reports";
import AdminReports from "@/components/admin-reports";
import AdminCoupons, { type AdminCoupon } from "@/components/admin-coupons";
import { getStoreRole } from "@/lib/supabase/roles";
import { getStorefrontContent } from "@/lib/storefront-content-server";
import { getAdminUser } from "@/lib/supabase/admin-user";
import { createAdminSupabase } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const storefrontContent = await getStorefrontContent();
  let products: AdminProduct[] = [];
  let orders: AdminOrder[] = [];
  let returnRequests: AdminReturnRequest[] = [];
  let customers: AdminCustomer[] = [];
  let reportOrders: AdminReportOrder[] = [];
  let coupons: AdminCoupon[] = [];
  try {
    const supabase = createAdminSupabase();
    const [productResult, orderResult, returnResult, reportResult, usersResult, couponResult] = await Promise.all([
      supabase.from("products").select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, stock, featured, active, created_at").order("created_at", { ascending: false }),
      supabase.from("orders").select("id, order_number, customer_name, email, phone, shipping_address, total_paise, status, payment_status, tracking_carrier, tracking_number, tracking_url, created_at, order_items(product_name, size, quantity)").order("created_at", { ascending: false }).limit(50),
      supabase.from("return_requests").select("id, order_id, user_id, reason, details, status, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("orders").select("email, total_paise, payment_status, created_at").order("created_at", { ascending: false }).limit(1000),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase.from("discount_coupons").select("id, code, discount_type, discount_value, minimum_order_paise, maximum_discount_paise, starts_at, expires_at, usage_limit, usage_count, active").order("created_at", { ascending: false }).limit(200),
    ]);
    if (productResult.data) products = productResult.data.map((item) => ({ id: item.id, slug: item.slug, name: item.name, category: item.category, pricePaise: item.price_paise, compareAtPaise: item.compare_at_paise ?? undefined, size: item.size, concentration: item.concentration, notes: item.notes, description: item.description, imageUrl: item.image_url, accent: item.accent, stock: item.stock, featured: item.featured, active: item.active, createdAt: item.created_at }));
    if (orderResult.data) orders = orderResult.data as unknown as AdminOrder[];
    reportOrders = reportResult.data ?? [];
    coupons = (couponResult.data ?? []) as AdminCoupon[];
    const customerUsers = usersResult.data?.users.filter((item) => getStoreRole(item) === "customer") ?? [];
    if (customerUsers.length) {
      const userIds = customerUsers.map((item) => item.id);
      const emails = customerUsers.map((item) => item.email?.toLowerCase()).filter((email): email is string => Boolean(email));
      const [{ data: profiles }, { data: customerOrders }] = await Promise.all([
        supabase.from("customer_profiles").select("user_id, full_name, phone, admin_note").in("user_id", userIds),
        emails.length ? supabase.from("orders").select("email, total_paise, created_at").in("email", emails).limit(1000) : Promise.resolve({ data: [] }),
      ]);
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      const ordersByEmail = new Map<string, { count: number; spent: number }>();
      for (const order of customerOrders ?? []) {
        const email = order.email.toLowerCase();
        const current = ordersByEmail.get(email) ?? { count: 0, spent: 0 };
        current.count += 1; current.spent += order.total_paise; ordersByEmail.set(email, current);
      }
      customers = customerUsers.flatMap((item) => item.email ? [{
        id: item.id, email: item.email, full_name: profileMap.get(item.id)?.full_name || item.user_metadata?.full_name || "", phone: profileMap.get(item.id)?.phone ?? "",
        created_at: item.created_at, last_sign_in_at: item.last_sign_in_at ?? null, order_count: ordersByEmail.get(item.email.toLowerCase())?.count ?? 0,
        spent_paise: ordersByEmail.get(item.email.toLowerCase())?.spent ?? 0, admin_note: profileMap.get(item.id)?.admin_note ?? "",
      }] : []);
    }
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
  return <main className="admin-page"><header className="admin-topbar"><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><div><span>{user.email}</span><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></header><AdminDashboard products={products} orders={orders} returnRequests={returnRequests} customers={customers} coupons={coupons} couponPanel={<AdminCoupons initialCoupons={coupons}/>} reportPanel={<AdminReports orders={reportOrders} now={new Date().toISOString()}/>} categories={storefrontContent.categories} storefrontSettings={storefrontContent.settings} /></main>;
}
