import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ShieldCheck, Store, UserCheck } from "lucide-react";
import AdminDashboard, { type AdminOrder, type AdminProduct, type AdminReturnRequest } from "@/components/admin-dashboard";
import type { AdminCustomer } from "@/components/admin-customers";
import type { AdminReportOrder } from "@/components/admin-reports";
import AdminReports from "@/components/admin-reports";
import AdminSellers, { type AdminSeller, type SellerProduct } from "@/components/admin-sellers";
import AdminCoupons, { type AdminCoupon } from "@/components/admin-coupons";
import { getStoreRole } from "@/lib/supabase/roles";
import { getStorefrontContent } from "@/lib/storefront-content-server";
import { getAdminUser } from "@/lib/supabase/admin-user";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Executive Owner Admin - Flovexa Control Center");

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
  let sellers: AdminSeller[] = [];

  try {
    const supabase = createAdminSupabase();

    const [productResult, orderResult, returnResult, reportResult, usersResult, couponResult, orderItemsResult] =
      await Promise.all([
        supabase
          .from("products")
          .select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, stock, featured, active, created_at, seller_id")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id, order_number, customer_name, email, phone, shipping_address, total_paise, discount_paise, coupon_code, status, payment_status, tracking_carrier, tracking_number, tracking_url, created_at, order_items(id, product_id, product_name, size, quantity, line_total_paise, seller_id)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("return_requests")
          .select("id, order_id, user_id, reason, details, status, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("orders")
          .select("email, total_paise, payment_status, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        supabase
          .from("discount_coupons")
          .select("id, code, discount_type, discount_value, minimum_order_paise, maximum_discount_paise, starts_at, expires_at, usage_limit, usage_count, active")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("order_items")
          .select("id, product_id, quantity, line_total_paise, seller_id"),
      ]);

    // 1. Seller Profiles & Map
    const { data: sellerProfiles } = await supabase
      .from("seller_profiles")
      .select("user_id, store_name, status, admin_note, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    const sellerNameMap = new Map<string, string>();
    for (const sp of sellerProfiles ?? []) {
      if (sp.store_name) sellerNameMap.set(sp.user_id, sp.store_name);
    }

    const authUsers = usersResult.data?.users ?? [];
    const usersById = new Map(authUsers.map((item) => [item.id, item]));

    // 2. Aggregate sales per product and per seller from order items
    const allOrderItems = orderItemsResult.data ?? [];
    const salesByProductId = new Map<string, { units: number; paise: number }>();
    const salesBySellerId = new Map<string, { units: number; paise: number }>();

    for (const item of allOrderItems) {
      if (item.product_id) {
        const curr = salesByProductId.get(item.product_id) ?? { units: 0, paise: 0 };
        curr.units += item.quantity ?? 1;
        curr.paise += item.line_total_paise ?? 0;
        salesByProductId.set(item.product_id, curr);
      }
      if (item.seller_id) {
        const curr = salesBySellerId.get(item.seller_id) ?? { units: 0, paise: 0 };
        curr.units += item.quantity ?? 1;
        curr.paise += item.line_total_paise ?? 0;
        salesBySellerId.set(item.seller_id, curr);
      }
    }

    // 3. Seller Fulfillments
    const orderIds = (orderResult.data ?? []).map((order) => order.id);
    const sellerFulfillmentResult = orderIds.length
      ? await supabase
          .from("seller_fulfillments")
          .select("order_id, status, tracking_carrier, tracking_number, tracking_url, seller_profiles(store_name)")
          .in("order_id", orderIds)
      : { data: [], error: null };

    if (sellerFulfillmentResult.error) throw sellerFulfillmentResult.error;

    const sellerFulfillmentsByOrder = new Map<string, AdminOrder["seller_fulfillments"]>();
    for (const shipment of sellerFulfillmentResult.data ?? []) {
      const current = sellerFulfillmentsByOrder.get(shipment.order_id) ?? [];
      current.push({
        status: shipment.status,
        tracking_carrier: shipment.tracking_carrier,
        tracking_number: shipment.tracking_number,
        tracking_url: shipment.tracking_url,
        store_name:
          (shipment.seller_profiles as unknown as { store_name: string } | null)?.store_name ?? "Marketplace seller",
      });
      sellerFulfillmentsByOrder.set(shipment.order_id, current);
    }

    // 4. Products with Seller Attribution and Sales
    const rawProducts = productResult.data ?? [];
    products = rawProducts.map((item) => {
      const sellerName = item.seller_id
        ? sellerNameMap.get(item.seller_id) || "Marketplace Seller"
        : "Flovexa Official";
      const stats = salesByProductId.get(item.id);

      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        category: item.category,
        pricePaise: item.price_paise,
        compareAtPaise: item.compare_at_paise ?? undefined,
        size: item.size,
        concentration: item.concentration,
        notes: item.notes,
        description: item.description,
        imageUrl: item.image_url,
        accent: item.accent,
        stock: item.stock,
        featured: item.featured,
        active: item.active,
        createdAt: item.created_at,
        sellerId: item.seller_id,
        sellerName,
        unitsSold: stats?.units ?? 0,
        salesPaise: stats?.paise ?? 0,
      };
    });

    // 5. Orders with Line Items & Seller Names
    if (orderResult.data) {
      orders = orderResult.data.map((order) => {
        const enrichedItems = (order.order_items ?? []).map((item) => ({
          ...item,
          seller_name: item.seller_id
            ? sellerNameMap.get(item.seller_id) || "Marketplace Seller"
            : "Flovexa Official",
        }));

        return {
          ...order,
          order_items: enrichedItems,
          seller_fulfillments: sellerFulfillmentsByOrder.get(order.id) ?? [],
        };
      }) as unknown as AdminOrder[];
    }

    reportOrders = reportResult.data ?? [];
    coupons = (couponResult.data ?? []) as AdminCoupon[];

    // 6. Sellers with Computed Products and Metrics
    const productsBySellerId = new Map<string, SellerProduct[]>();
    for (const p of rawProducts) {
      if (p.seller_id) {
        const list = productsBySellerId.get(p.seller_id) ?? [];
        list.push({
          id: p.id,
          name: p.name,
          price_paise: p.price_paise,
          stock: p.stock,
          active: p.active,
          image_url: p.image_url,
          category: p.category,
        });
        productsBySellerId.set(p.seller_id, list);
      }
    }

    sellers = (sellerProfiles ?? []).flatMap((profile) => {
      const sellerUser = usersById.get(profile.user_id);
      if (!sellerUser?.email) return [];

      const sellerProds = productsBySellerId.get(profile.user_id) ?? [];
      const sellerSales = salesBySellerId.get(profile.user_id) ?? { units: 0, paise: 0 };
      const totalStock = sellerProds.reduce((sum, p) => sum + (p.stock || 0), 0);

      return [
        {
          id: sellerUser.id,
          email: sellerUser.email,
          store_name: profile.store_name || sellerUser.user_metadata?.store_name || "",
          status: profile.status as AdminSeller["status"],
          created_at: profile.created_at,
          admin_note: profile.admin_note ?? "",
          product_count: sellerProds.length,
          total_stock: totalStock,
          orders_fulfilled: sellerSales.units,
          total_sales_paise: sellerSales.paise,
          products: sellerProds,
        },
      ];
    });

    // 7. Customers
    const profileMap = new Map((sellerProfiles ?? []).map((p) => [p.user_id, p]));
    const customerUsers = authUsers.filter((item) => getStoreRole(item) === "customer" && !profileMap.has(item.id));
    if (customerUsers.length) {
      const userIds = customerUsers.map((item) => item.id);
      const emails = customerUsers.map((item) => item.email?.toLowerCase()).filter((email): email is string => Boolean(email));

      const [{ data: profiles }, { data: customerOrders }] = await Promise.all([
        supabase.from("customer_profiles").select("user_id, full_name, phone, admin_note").in("user_id", userIds),
        emails.length
          ? supabase.from("orders").select("email, total_paise, created_at").in("email", emails).limit(1000)
          : Promise.resolve({ data: [] }),
      ]);

      const custProfileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      const ordersByEmail = new Map<string, { count: number; spent: number }>();

      for (const order of customerOrders ?? []) {
        const email = order.email.toLowerCase();
        const current = ordersByEmail.get(email) ?? { count: 0, spent: 0 };
        current.count += 1;
        current.spent += order.total_paise;
        ordersByEmail.set(email, current);
      }

      customers = customerUsers.flatMap((item) =>
        item.email
          ? [
              {
                id: item.id,
                email: item.email,
                full_name: custProfileMap.get(item.id)?.full_name || item.user_metadata?.full_name || "",
                phone: custProfileMap.get(item.id)?.phone ?? "",
                created_at: item.created_at,
                last_sign_in_at: item.last_sign_in_at ?? null,
                order_count: ordersByEmail.get(item.email.toLowerCase())?.count ?? 0,
                spent_paise: ordersByEmail.get(item.email.toLowerCase())?.spent ?? 0,
                admin_note: custProfileMap.get(item.id)?.admin_note ?? "",
              },
            ]
          : []
      );
    }

    // 8. Returns
    if (returnResult.data?.length) {
      const returnOrderIds = [...new Set(returnResult.data.map((item) => item.order_id))];
      const known = new Map(orders.map((order) => [order.id, order]));
      const missingIds = returnOrderIds.filter((id) => !known.has(id));
      if (missingIds.length) {
        const { data } = await supabase
          .from("orders")
          .select("id, order_number, customer_name, email, total_paise")
          .in("id", missingIds);
        for (const order of data ?? []) known.set(order.id, order as typeof orders[number]);
      }
      returnRequests = returnResult.data.map((item) => ({ ...item, order: known.get(item.order_id) ?? null }));
    }
  } catch (error) {
    console.error("Could not load store admin data", error instanceof Error ? error.message : "Unknown error");
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand-wrap">
          <Link href="/store" className="wordmark">
            FLOVEXA<span>PERFUMES</span>
          </Link>
          <span className="admin-role-badge">
            <ShieldCheck size={13} /> MASTER OWNER CONTROL
          </span>
        </div>

        <div className="admin-topbar-actions">
          <Link href="/seller" className="admin-topbar-portal-btn" title="Open Marketplace Seller Central">
            <Store size={13} /> Seller Central
          </Link>

          <Link href="/store" target="_blank" className="admin-topbar-store-btn" title="Visit Live Storefront">
            <ExternalLink size={13} /> Live Store
          </Link>

          <span className="admin-user-email">{user.email}</span>

          <form action="/auth/signout" method="post">
            <button type="submit" className="admin-signout-btn">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <AdminDashboard
        products={products}
        orders={orders}
        returnRequests={returnRequests}
        customers={customers}
        sellers={sellers}
        coupons={coupons}
        couponPanel={<AdminCoupons initialCoupons={coupons} />}
        sellerPanel={
          <AdminSellers
            initialSellers={sellers}
            initialCustomers={customers.map(({ id, email, full_name }) => ({ id, email, full_name }))}
          />
        }
        reportPanel={<AdminReports orders={reportOrders} now={new Date().toISOString()} />}
        categories={storefrontContent.categories}
        storefrontSettings={storefrontContent.settings}
      />
    </main>
  );
}
