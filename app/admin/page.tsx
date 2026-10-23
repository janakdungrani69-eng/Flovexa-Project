import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ShieldCheck, Store, UserCheck } from "lucide-react";
import AdminDashboard, { type AdminOrder, type AdminProduct, type AdminReturnRequest } from "@/components/admin-dashboard";
import type { AdminCustomer, CustomerProductPurchase, CustomerOrderRecord, CustomerAddressRecord } from "@/components/admin-customers";
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

    // 7. Customers & Purchase Frequency Intelligence
    const profileMap = new Map((sellerProfiles ?? []).map((p) => [p.user_id, p]));
    const customerUsers = authUsers.filter((item) => getStoreRole(item) === "customer" && !profileMap.has(item.id));
    const customerUserIds = customerUsers.map((item) => item.id);
    const registeredEmailsSet = new Set(customerUsers.map((item) => item.email?.toLowerCase()).filter(Boolean));

    const [{ data: customerProfiles }, { data: allStoreOrders }] = await Promise.all([
      customerUserIds.length
        ? supabase.from("customer_profiles").select("user_id, full_name, phone, gender, admin_note").in("user_id", customerUserIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("orders")
        .select("id, order_number, customer_name, email, phone, shipping_address, total_paise, status, payment_status, created_at, order_items(id, product_id, product_name, size, quantity, unit_price_paise, line_total_paise)")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    const custProfileMap = new Map((customerProfiles ?? []).map((cp) => [cp.user_id, cp]));

    // Group all store orders by email
    type RawOrderWithItems = NonNullable<typeof allStoreOrders>[number];
    const ordersByEmail = new Map<string, RawOrderWithItems[]>();
    for (const ord of allStoreOrders ?? []) {
      if (!ord.email) continue;
      const em = ord.email.toLowerCase().trim();
      const list = ordersByEmail.get(em) ?? [];
      list.push(ord);
      ordersByEmail.set(em, list);
    }

    // Builder function for buyer purchase stats
    function buildBuyerStats(buyerOrders: RawOrderWithItems[]) {
      let spent = 0;
      const prodMap = new Map<string, CustomerProductPurchase>();
      const addressMap = new Map<string, CustomerAddressRecord>();

      for (const ord of buyerOrders ?? []) {
        spent += ord.total_paise ?? 0;

        // Extract and deduplicate delivery address
        const addr = ord.shipping_address as unknown as { line1?: string; line2?: string; city?: string; state?: string; pincode?: string } | null;
        if (addr && addr.line1 && addr.pincode) {
          const aKey = `${addr.line1}_${addr.pincode}`.toLowerCase();
          if (!addressMap.has(aKey)) {
            addressMap.set(aKey, {
              line1: addr.line1,
              line2: addr.line2 ?? "",
              city: addr.city ?? "",
              state: addr.state ?? "",
              pincode: addr.pincode ?? "",
            });
          }
        }

        // Aggregate individual perfumes bought and count how many times each was purchased
        for (const item of ord.order_items ?? []) {
          const key = `${item.product_name}___${item.size}`;
          const qty = item.quantity || 1;
          const lineSpent = item.line_total_paise || (item.unit_price_paise ? item.unit_price_paise * qty : 0);
          const existing = prodMap.get(key);
          if (existing) {
            existing.total_quantity += qty;
            existing.total_spent_paise += lineSpent;
            if (new Date(ord.created_at) > new Date(existing.last_purchased_at)) {
              existing.last_purchased_at = ord.created_at;
            }
          } else {
            prodMap.set(key, {
              product_id: item.product_id,
              product_name: item.product_name,
              size: item.size,
              total_quantity: qty,
              total_spent_paise: lineSpent,
              last_purchased_at: ord.created_at,
            });
          }
        }
      }

      const products_bought = Array.from(prodMap.values()).sort((a, b) => b.total_quantity - a.total_quantity);
      const addresses = Array.from(addressMap.values());
      const recent_orders: CustomerOrderRecord[] = (buyerOrders ?? []).slice(0, 10).map((o) => ({
        id: o.id,
        order_number: o.order_number,
        total_paise: o.total_paise,
        status: o.status,
        payment_status: o.payment_status,
        created_at: o.created_at,
        items: (o.order_items ?? []).map((i) => ({ product_name: i.product_name, size: i.size, quantity: i.quantity })),
      }));

      const latestOrder = buyerOrders?.[0];
      const last_order_at = latestOrder ? latestOrder.created_at : null;
      const days_since_last_order = last_order_at
        ? Math.max(0, Math.floor((Date.now() - new Date(last_order_at).getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      const order_count = (buyerOrders ?? []).length;
      const aov_paise = order_count > 0 ? Math.round(spent / order_count) : 0;

      const tier: AdminCustomer["tier"] =
        order_count >= 3 || spent >= 500000
          ? "vip"
          : order_count >= 2
          ? "repeat"
          : order_count === 1
          ? "active"
          : "lead";

      return {
        spent_paise: spent,
        order_count,
        aov_paise,
        last_order_at,
        days_since_last_order,
        tier,
        products_bought,
        recent_orders,
        addresses,
      };
    }

    // 1. Process all registered member accounts
    const registeredCustomers: AdminCustomer[] = customerUsers.flatMap((u) => {
      if (!u.email) return [];
      const em = u.email.toLowerCase().trim();
      const profile = custProfileMap.get(u.id);
      const userOrders = ordersByEmail.get(em) ?? [];
      const stats = buildBuyerStats(userOrders);

      const fullName = profile?.full_name || u.user_metadata?.full_name || userOrders[0]?.customer_name || "";
      const phone = profile?.phone || u.user_metadata?.phone || userOrders[0]?.phone || "";
      const gender = profile?.gender || u.user_metadata?.gender || "prefer_not_to_say";

      const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "");
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const whatsapp_url = cleanPhone
        ? `https://wa.me/${fullPhone}?text=Hello%20${encodeURIComponent(fullName || "Valued Customer")},%20greetings%20from%20Flovexa%20Perfumes!`
        : undefined;

      return [
        {
          id: u.id,
          email: u.email,
          full_name: fullName,
          phone,
          gender,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          admin_note: profile?.admin_note ?? "",
          whatsapp_url,
          ...stats,
        },
      ];
    });

    // 2. Include guest buyers who placed orders with emails not in auth.users
    const guestCustomers: AdminCustomer[] = [];
    for (const [em, buyerOrders] of ordersByEmail.entries()) {
      if (registeredEmailsSet.has(em)) continue;
      const latest = buyerOrders[0];
      if (!latest) continue;

      const stats = buildBuyerStats(buyerOrders);
      const fullName = latest.customer_name || "";
      const phone = latest.phone || "";

      const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "");
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const whatsapp_url = cleanPhone
        ? `https://wa.me/${fullPhone}?text=Hello%20${encodeURIComponent(fullName || "Valued Customer")},%20greetings%20from%20Flovexa%20Perfumes!`
        : undefined;

      guestCustomers.push({
        id: latest.id,
        email: em,
        full_name: fullName,
        phone,
        created_at: latest.created_at,
        last_sign_in_at: null,
        admin_note: "",
        is_guest: true,
        whatsapp_url,
        ...stats,
        tier: stats.tier === "lead" ? "guest" : stats.tier,
      });
    }

    customers = [...registeredCustomers, ...guestCustomers];

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
