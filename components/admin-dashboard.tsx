"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Box,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  ImagePlus,
  LayoutDashboard,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Undo2,
  Users,
  UsersRound,
} from "lucide-react";
import type { Product } from "@/lib/products";
import AdminCustomers, { type AdminCustomer } from "@/components/admin-customers";
import AdminStorefront from "@/components/admin-storefront";
import AdminReviews, { type AdminReview } from "@/components/admin-reviews";
import type { AdminCoupon } from "@/components/admin-coupons";
import type { AdminSeller } from "@/components/admin-sellers";
import type { StorefrontSettings } from "@/lib/storefront-content";
import ShippingLabelModal, { type ShippingLabelOrder } from "@/components/shipping-label-modal";

export type AdminProduct = Product & {
  stock: number;
  createdAt: string;
  sellerId?: string | null;
  sellerName?: string;
  unitsSold?: number;
  salesPaise?: number;
};

export type AdminOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  phone: string;
  shipping_address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  total_paise: number;
  discount_paise: number;
  coupon_code: string | null;
  status: string;
  payment_status: string;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  order_items: {
    id?: string;
    product_id?: string | null;
    product_name: string;
    size: string;
    quantity: number;
    unit_price_paise?: number;
    line_total_paise?: number;
    seller_id?: string | null;
    seller_name?: string;
  }[];
  seller_fulfillments: {
    status: string;
    tracking_carrier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    store_name: string;
  }[];
};

export type AdminReturnRequest = {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  order: { order_number: string; customer_name: string; email: string; total_paise: number } | null;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

const blank = {
  name: "",
  slug: "",
  category: "Unisex",
  price: "",
  compareAtPrice: "",
  size: "50 ml",
  concentration: "Eau de Parfum",
  notes: "",
  description: "",
  imageUrl: "",
  accent: "#ad7045",
  stock: "0",
  featured: false,
  active: false,
};

const slugFromName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);

export default function AdminDashboard({
  products: initialProducts,
  orders: initialOrders,
  returnRequests: initialReturns,
  customers,
  sellers,
  coupons,
  couponPanel,
  sellerPanel,
  reportPanel,
  reviews = [],
  reviewPanel,
  categories,
  storefrontSettings,
}: {
  products: AdminProduct[];
  orders: AdminOrder[];
  returnRequests: AdminReturnRequest[];
  customers: AdminCustomer[];
  sellers: AdminSeller[];
  coupons: AdminCoupon[];
  couponPanel: ReactNode;
  sellerPanel: ReactNode;
  reportPanel: ReactNode;
  reviews?: AdminReview[];
  reviewPanel?: ReactNode;
  categories: string[];
  storefrontSettings: StorefrontSettings;
}) {
  const [tab, setTab] = useState<
    "overview" | "orders" | "products" | "sellers" | "customers" | "returns" | "reports" | "storefront" | "promotions" | "reviews"
  >("overview");
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [returnRequests, setReturnRequests] = useState(initialReturns);
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [slugTouched, setSlugTouched] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Search & Filter States
  const [productSearch, setProductSearch] = useState("");
  const [productSellerFilter, setProductSellerFilter] = useState("all");
  const [productStockFilter, setProductStockFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

  const [shipments, setShipments] = useState<
    Record<string, { trackingCarrier: string; trackingNumber: string; trackingUrl: string }>
  >({});
  const [selectedLabelOrder, setSelectedLabelOrder] = useState<ShippingLabelOrder | null>(null);

  // Key Calculations for Overview Cockpit
  const paidTotal = useMemo(
    () => orders.filter((order) => order.payment_status === "captured").reduce((sum, order) => sum + order.total_paise, 0),
    [orders]
  );
  const totalStock = useMemo(() => products.reduce((sum, item) => sum + item.stock, 0), [products]);
  const activeProducts = useMemo(() => products.filter((item) => item.active), [products]);
  const lowStockProducts = useMemo(() => products.filter((item) => item.stock <= 10), [products]);
  const outOfStockProducts = useMemo(() => products.filter((item) => item.stock === 0), [products]);

  const unfulfilledOrders = useMemo(
    () => orders.filter((order) => order.status === "paid" || order.status === "processing"),
    [orders]
  );
  const pendingSellers = useMemo(
    () => sellers.filter((s) => s.status === "suspended" && s.admin_note?.includes("PENDING_APPROVAL")),
    [sellers]
  );
  const activeSellers = useMemo(() => sellers.filter((s) => s.status === "active"), [sellers]);
  const openReturns = useMemo(
    () => returnRequests.filter((item) => item.status === "requested" || item.status === "under_review"),
    [returnRequests]
  );
  const leadCustomers = useMemo(() => customers.filter((c) => c.tier === "lead"), [customers]);
  const topCustomers = useMemo(() => {
    return [...customers]
      .filter((c) => c.order_count > 0)
      .sort((a, b) => b.spent_paise - a.spent_paise)
      .slice(0, 4);
  }, [customers]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Search
      const searchMatch =
        !productSearch.trim() ||
        `${item.name} ${item.slug} ${item.category} ${item.sellerName ?? ""}`
          .toLowerCase()
          .includes(productSearch.toLowerCase());
      if (!searchMatch) return false;

      // Seller filter
      if (productSellerFilter === "flovexa" && item.sellerId) return false;
      if (productSellerFilter !== "all" && productSellerFilter !== "flovexa") {
        if (item.sellerName !== productSellerFilter) return false;
      }

      // Stock filter
      if (productStockFilter === "low" && (item.stock > 10 || item.stock === 0)) return false;
      if (productStockFilter === "out" && item.stock !== 0) return false;
      if (productStockFilter === "in" && item.stock <= 10) return false;

      return true;
    });
  }, [products, productSearch, productSellerFilter, productStockFilter]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderFilter !== "all" && order.status !== orderFilter) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matches =
          order.order_number.toLowerCase().includes(q) ||
          order.customer_name.toLowerCase().includes(q) ||
          order.email.toLowerCase().includes(q) ||
          order.phone.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, orderFilter, orderSearch]);

  // Unique seller names for product filter dropdown
  const uniqueSellerNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.sellerName && p.sellerName !== "Flovexa Official") {
        set.add(p.sellerName);
      }
    }
    return Array.from(set);
  }, [products]);

  // Top products by units sold
  const topProducts = useMemo(() => {
    return [...products]
      .filter((p) => (p.unitsSold ?? 0) > 0)
      .sort((a, b) => (b.unitsSold ?? 0) - (a.unitsSold ?? 0))
      .slice(0, 5);
  }, [products]);

  function openProduct(product?: AdminProduct) {
    setFormOpen(true);
    setSelected(product ?? null);
    setSlugTouched(Boolean(product));
    setForm(
      product
        ? {
            name: product.name,
            slug: product.slug,
            category: product.category,
            price: (product.pricePaise / 100).toFixed(2),
            compareAtPrice: product.compareAtPaise ? (product.compareAtPaise / 100).toFixed(2) : "",
            size: product.size,
            concentration: product.concentration,
            notes: product.notes.join(", "),
            description: product.description,
            imageUrl: product.imageUrl ?? "",
            accent: product.accent,
            stock: String(product.stock),
            featured: product.featured,
            active: product.active,
          }
        : {
            ...blank,
            category: categories.includes("Unisex") ? "Unisex" : categories[0] ?? "Unisex",
          }
    );
    setMessage("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/products", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
          id: selected?.id,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save product.");
      if (selected) {
        setProducts((current) =>
          current.map((item) => (item.id === result.product.id ? { ...result.product, sellerName: item.sellerName } : item))
        );
      } else {
        setProducts((current) => [{ ...result.product, sellerName: "Flovexa Official" }, ...current]);
      }
      setMessage("Perfume saved successfully.");
      setSelected(null);
      setFormOpen(false);
      setForm(blank);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadProductImage(file?: File) {
    if (!file) return;
    setUploadingImage(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/api/admin/products/image", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not upload this image.");
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }));
      setMessage("Product photo uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload this image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function toggleProduct(product: AdminProduct) {
    const response = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        price: product.pricePaise / 100,
        compareAtPrice: product.compareAtPaise ? product.compareAtPaise / 100 : null,
        size: product.size,
        concentration: product.concentration,
        notes: product.notes.join(", "),
        description: product.description,
        imageUrl: product.imageUrl ?? "",
        accent: product.accent,
        stock: product.stock,
        featured: product.featured,
        active: !product.active,
      }),
    });
    const result = await response.json();
    if (response.ok) {
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...result.product, sellerName: item.sellerName } : item))
      );
    } else {
      setMessage(result.error ?? "Could not update product.");
    }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!window.confirm(`Permanently delete ${product.name}? Products with order history cannot be deleted.`)) return;
    setDeletingProductId(product.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete this perfume.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage(`${product.name} was deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete this perfume.");
    } finally {
      setDeletingProductId(null);
    }
  }

  async function updateOrder(order: AdminOrder, status = order.status) {
    const values = shipments[order.id] ?? {
      trackingCarrier: order.tracking_carrier ?? "",
      trackingNumber: order.tracking_number ?? "",
      trackingUrl: order.tracking_url ?? "",
    };
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...values }),
    });
    const result = await response.json();
    if (response.ok) {
      setOrders((current) => current.map((item) => (item.id === order.id ? result.order : item)));
      setMessage(`Fulfillment for order ${order.order_number} updated.`);
    } else {
      setMessage(result.error ?? "Could not update order.");
    }
  }

  async function updateReturn(item: AdminReturnRequest, status: "under_review" | "approved" | "declined") {
    setMessage("");
    const response = await fetch(`/api/admin/returns/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (response.ok) {
      setReturnRequests((current) =>
        current.map((request) => (request.id === item.id ? { ...request, status: result.returnRequest.status } : request))
      );
      setMessage(`Return request for ${item.order?.order_number ?? "the order"} updated.`);
    } else {
      setMessage(result.error ?? "Could not update this return request.");
    }
  }

  return (
    <div className="admin-shell">
      {/* LUXURY ADMIN SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-label">CONTROL CENTER</div>

        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => {
            setTab("overview");
            setMessage("");
          }}
        >
          <LayoutDashboard size={16} /> Overview
        </button>

        <button
          className={tab === "orders" ? "active" : ""}
          onClick={() => {
            setTab("orders");
            setMessage("");
          }}
        >
          <ShoppingBag size={16} /> Orders
          {unfulfilledOrders.length > 0 ? (
            <span style={{ background: "#92734c", color: "#fff", padding: "1px 6px", borderRadius: 9999 }}>
              {unfulfilledOrders.length}
            </span>
          ) : (
            <span>{orders.length}</span>
          )}
        </button>

        <button
          className={tab === "products" ? "active" : ""}
          onClick={() => {
            setTab("products");
            setMessage("");
          }}
        >
          <Box size={16} /> Products <span>{products.length}</span>
        </button>

        <button
          className={tab === "sellers" ? "active" : ""}
          onClick={() => {
            setTab("sellers");
            setMessage("");
          }}
        >
          <UsersRound size={16} /> Sellers
          {pendingSellers.length > 0 ? (
            <span style={{ background: "#c2410c", color: "#fff", padding: "1px 6px", borderRadius: 9999 }}>
              {pendingSellers.length}
            </span>
          ) : (
            <span>{sellers.length}</span>
          )}
        </button>

        <button
          className={tab === "customers" ? "active" : ""}
          onClick={() => {
            setTab("customers");
            setMessage("");
          }}
        >
          <Users size={16} /> Customers <span>{customers.length}</span>
        </button>

        <button
          className={tab === "returns" ? "active" : ""}
          onClick={() => {
            setTab("returns");
            setMessage("");
          }}
        >
          <Undo2 size={16} /> Returns
          {openReturns.length > 0 && (
            <span style={{ background: "#b45309", color: "#fff", padding: "1px 6px", borderRadius: 9999 }}>
              {openReturns.length}
            </span>
          )}
        </button>

        <button
          className={tab === "reports" ? "active" : ""}
          onClick={() => {
            setTab("reports");
            setMessage("");
          }}
        >
          <TrendingUp size={16} /> Reports
        </button>

        <button
          className={tab === "promotions" ? "active" : ""}
          onClick={() => {
            setTab("promotions");
            setMessage("");
          }}
        >
          <Tag size={16} /> Promotions <span>{coupons.length}</span>
        </button>

        <button
          className={tab === "reviews" ? "active" : ""}
          onClick={() => {
            setTab("reviews");
            setMessage("");
          }}
        >
          <Star size={16} /> Reviews <span>{reviews.length}</span>
        </button>

        <button
          className={tab === "storefront" ? "active" : ""}
          onClick={() => {
            setTab("storefront");
            setMessage("");
          }}
        >
          Storefront
        </button>

        <div className="admin-sidebar-bottom">
          <span>FLOVEXA PERFUMES</span>
          <small>MASTER CONTROL CENTER</small>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <section className="admin-content">
        {/* TOPBAR / HEADER */}
        <div className="admin-content-head">
          <div>
            <span className="eyebrow">EXECUTIVE OWNER ADMINISTRATION · INDIA</span>
            <h1>
              {tab === "overview"
                ? "Executive Monitoring"
                : tab === "orders"
                ? "Orders & Dispatch"
                : tab === "products"
                ? "Product Catalogue"
                : tab === "sellers"
                ? "Seller Accounts"
                : tab === "customers"
                ? "Customer CRM"
                : tab === "returns"
                ? "Return Requests"
                : tab === "reports"
                ? "Sales & Financials"
                : tab === "promotions"
                ? "Promotions & Coupons"
                : tab === "reviews"
                ? "Customer Reviews & Social Proof"
                : "Storefront Settings"}
            </h1>
            <p>
              {tab === "overview"
                ? "Live command center tracking marketplace sales, seller operations, stock levels, and fulfillment velocity."
                : tab === "orders"
                ? "Monitor every customer order, track seller fulfillments, and generate consolidated combo shipping labels."
                : tab === "products"
                ? "Full inventory catalogue across Flovexa Official and all verified marketplace merchants."
                : tab === "sellers"
                ? "Review merchant applications, authorize store access, inspect seller catalog and monitor gross sales."
                : tab === "customers"
                ? "Customer database, order totals, lifetime value and private administrative service notes."
                : tab === "returns"
                ? "Inspect and resolve return requests submitted by verified buyers."
                : tab === "reports"
                ? "Executive revenue breakdown, daily run-rates, and order analytics."
                : tab === "promotions"
                ? "Configure promotional discount vouchers and coupon redemption rules."
                : tab === "reviews"
                ? "Moderate buyer fragrance ratings from delivered orders and feature top reviews on the main storefront."
                : "Customize homepage branding, luxury category navigation, and messaging."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/seller" className="admin-primary" style={{ background: "#3d3428" }}>
              <Store size={14} /> Seller Central
            </Link>
            <Link href="/store" target="_blank" className="admin-primary" style={{ background: "#4a4235" }}>
              <ExternalLink size={14} /> View Storefront
            </Link>
            {tab === "products" && (
              <button className="admin-primary" onClick={() => openProduct()}>
                <Plus size={16} /> Add a perfume
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className="admin-message" role="status">
            <Check size={16} />
            {message}
          </div>
        )}

        {/* =========================================================================
            TAB 1: EXECUTIVE OVERVIEW (DEFAULT)
           ========================================================================= */}
        {tab === "overview" && (
          <div className="admin-overview-flow">
            {/* 4 PRIMARY METRIC CARDS */}
            <div className="admin-stats admin-stats-4">
              <div>
                <span>
                  <CircleDollarSign size={15} /> GROSS STORE SALES
                </span>
                <b>{money(paidTotal)}</b>
                <small>{orders.filter((o) => o.payment_status === "captured").length} paid customer orders</small>
              </div>

              <div>
                <span>
                  <ShoppingBag size={15} /> ORDER VELOCITY
                </span>
                <b>{orders.length}</b>
                <small>
                  {unfulfilledOrders.length > 0 ? (
                    <strong style={{ color: "#b45309" }}>{unfulfilledOrders.length} awaiting dispatch</strong>
                  ) : (
                    "All orders up to date"
                  )}
                </small>
              </div>

              <div>
                <span>
                  <Store size={15} /> SELLER NETWORK
                </span>
                <b>{activeSellers.length}</b>
                <small>
                  {pendingSellers.length > 0 ? (
                    <strong style={{ color: "#c2410c" }}>{pendingSellers.length} pending approvals</strong>
                  ) : (
                    `${sellers.length} total merchants registered`
                  )}
                </small>
              </div>

              <div>
                <span>
                  <Package size={15} /> CATALOGUE &amp; STOCK
                </span>
                <b>{activeProducts.length}</b>
                <small>
                  {totalStock} units across store (
                  {lowStockProducts.length > 0 ? (
                    <span style={{ color: "#b45309" }}>{lowStockProducts.length} low stock</span>
                  ) : (
                    "Healthy"
                  )}
                  )
                </small>
              </div>
            </div>

            {/* ACTION ALERTS BANNER (IF ANY REQUIRE ATTENTION) */}
            {(pendingSellers.length > 0 || unfulfilledOrders.length > 0 || lowStockProducts.length > 0 || openReturns.length > 0 || leadCustomers.length > 0) && (
              <div className="admin-action-alerts-card">
                <div className="admin-alerts-header">
                  <AlertCircle size={18} style={{ color: "#aa8050" }} />
                  <div>
                    <h4>Operational Attention Required</h4>
                    <p>Actions needed to maintain seamless customer delivery and merchant onboarding.</p>
                  </div>
                </div>

                <div className="admin-alerts-grid">
                  {pendingSellers.length > 0 && (
                    <div className="alert-item alert-urgent">
                      <div>
                        <strong>{pendingSellers.length} Merchant Applications Waiting</strong>
                        <p>Sellers have registered and cannot list fragrances until you review and approve them.</p>
                      </div>
                      <button type="button" onClick={() => setTab("sellers")}>
                        Review Sellers <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {unfulfilledOrders.length > 0 && (
                    <div className="alert-item alert-info">
                      <div>
                        <strong>{unfulfilledOrders.length} Paid Orders Needing Dispatch</strong>
                        <p>Customer payments are captured. Courier labels and tracking numbers need to be assigned.</p>
                      </div>
                      <button type="button" onClick={() => setTab("orders")}>
                        Fulfill Orders <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {outOfStockProducts.length > 0 && (
                    <div className="alert-item alert-warning">
                      <div>
                        <strong>{outOfStockProducts.length} Fragrances Out of Stock (0 units)</strong>
                        <p>These perfumes cannot be purchased by shoppers right now.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProductStockFilter("out");
                          setTab("products");
                        }}
                      >
                        Inspect Stock <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {openReturns.length > 0 && (
                    <div className="alert-item alert-neutral">
                      <div>
                        <strong>{openReturns.length} Return Requests Awaiting Review</strong>
                        <p>Customers have initiated returns that require your decision.</p>
                      </div>
                      <button type="button" onClick={() => setTab("returns")}>
                        Inspect Returns <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {leadCustomers.length > 0 && (
                    <div className="alert-item" style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3" }}>
                      <div>
                        <strong>{leadCustomers.length} Registered Members Haven&apos;t Ordered Yet</strong>
                        <p>These buyers created accounts on Flovexa. Reach out with a welcome discount voucher to convert them!</p>
                      </div>
                      <button type="button" onClick={() => setTab("customers")} style={{ color: "#3730a3", borderColor: "#a5b4fc" }}>
                        View Leads <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2-COLUMN MONITORING DASHBOARD */}
            <div className="admin-overview-grid">
              {/* LEFT COLUMN: RECENT ORDERS WITH ATTRIBUTION & COMBO PRINT */}
              <div className="admin-panel">
                <div className="admin-panel-tools">
                  <h2>Recent Marketplace Orders</h2>
                  <button
                    type="button"
                    className="portal-switch-link"
                    onClick={() => setTab("orders")}
                    style={{ background: "none", border: 0, cursor: "pointer" }}
                  >
                    View All Orders ({orders.length}) →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="admin-empty" style={{ padding: "30px 10px" }}>
                    <ShoppingBag size={24} />
                    <b>No orders placed yet</b>
                    <span>When buyers complete checkout, real-time orders will display here.</span>
                  </div>
                ) : (
                  <div className="overview-orders-table">
                    {orders.slice(0, 5).map((order) => {
                      const totalBottles = order.order_items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                      const isCombo = totalBottles > 1 || order.order_items.length > 1;

                      return (
                        <div key={order.id} className="overview-order-row">
                          <div className="oor-main">
                            <div className="oor-top">
                              <span className="oor-number">{order.order_number}</span>
                              <span className={`order-status status-${order.status}`}>
                                {order.status.replaceAll("_", " ")}
                              </span>
                              {isCombo && (
                                <span className="admin-combo-pill" title="Multiple items, 1 single shipping label">
                                  Combo ({totalBottles})
                                </span>
                              )}
                            </div>
                            <div className="oor-customer">
                              <b>{order.customer_name}</b> · {order.email}
                            </div>
                            <div className="oor-items">
                              {order.order_items.map((item, idx) => (
                                <span key={`${order.id}-${idx}`}>
                                  {item.product_name} × {item.quantity}
                                  {item.seller_name && item.seller_name !== "Flovexa Official" ? (
                                    <small className="oor-seller-tag"> ({item.seller_name})</small>
                                  ) : null}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="oor-side">
                            <strong className="oor-total">{money(order.total_paise)}</strong>
                            <button
                              type="button"
                              className="admin-order-label-btn"
                              onClick={() => setSelectedLabelOrder(order)}
                              title="Print 1 shipping label for address"
                              style={{ marginTop: 6 }}
                            >
                              <Printer size={12} /> Label
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: TOP SELLERS & TOP PRODUCTS */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Active Sellers Snapshot */}
                <div className="admin-panel">
                  <div className="admin-panel-tools">
                    <h2>Marketplace Sellers Snapshot</h2>
                    <button
                      type="button"
                      className="portal-switch-link"
                      onClick={() => setTab("sellers")}
                      style={{ background: "none", border: 0, cursor: "pointer" }}
                    >
                      Manage ({sellers.length}) →
                    </button>
                  </div>

                  {sellers.length === 0 ? (
                    <div className="admin-empty" style={{ padding: "30px 10px" }}>
                      <Store size={24} />
                      <b>No sellers registered yet</b>
                      <span>Authorize customers or accept applications to grow your marketplace.</span>
                    </div>
                  ) : (
                    <div className="overview-sellers-list">
                      {sellers.slice(0, 4).map((seller) => (
                        <div key={seller.id} className="overview-seller-item">
                          <div className="osi-icon">
                            <Store size={15} />
                          </div>
                          <div className="osi-info">
                            <b>{seller.store_name || "Merchant Store"}</b>
                            <span>{seller.email}</span>
                          </div>
                          <div className="osi-metrics">
                            <span className="osi-prods">{seller.product_count ?? 0} listed</span>
                            <span className="osi-sales">{money(seller.total_sales_paise ?? 0)}</span>
                          </div>
                          <span
                            className={`seller-access-state ${seller.status}`}
                            style={{ fontSize: 7, padding: "3px 6px" }}
                          >
                            {seller.status === "active" ? "Active" : "Paused"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Selling Fragrances */}
                <div className="admin-panel">
                  <div className="admin-panel-tools">
                    <h2>Top Selling Fragrances</h2>
                    <button
                      type="button"
                      className="portal-switch-link"
                      onClick={() => setTab("products")}
                      style={{ background: "none", border: 0, cursor: "pointer" }}
                    >
                      All ({products.length}) →
                    </button>
                  </div>

                  {topProducts.length === 0 ? (
                    <div className="admin-empty" style={{ padding: "26px 10px" }}>
                      <Package size={22} />
                      <b>Sales velocity will track here</b>
                      <span>Top selling perfumes will appear once purchases are fulfilled.</span>
                    </div>
                  ) : (
                    <div className="overview-sellers-list">
                      {topProducts.map((p) => (
                        <div key={p.id} className="overview-seller-item">
                          <div
                            className="admin-product-swatch"
                            style={{ width: 28, height: 34, "--juice": p.accent } as React.CSSProperties}
                          >
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                width={28}
                                height={34}
                                unoptimized
                                style={{ objectFit: "cover", width: "100%", height: "100%" }}
                              />
                            ) : (
                              "F"
                            )}
                          </div>
                          <div className="osi-info">
                            <b>{p.name}</b>
                            <span>
                              {p.sellerName || "Flovexa Official"} · {p.stock} in stock
                            </span>
                          </div>
                          <div className="osi-metrics">
                            <strong style={{ color: "#9e7740" }}>{p.unitsSold} sold</strong>
                            <small>{money(p.salesPaise ?? 0)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Loyal VIP Buyers Leaderboard */}
                <div className="admin-panel">
                  <div className="admin-panel-tools">
                    <h2>Top Loyal VIP Buyers</h2>
                    <button
                      type="button"
                      className="portal-switch-link"
                      onClick={() => setTab("customers")}
                      style={{ background: "none", border: 0, cursor: "pointer" }}
                    >
                      Directory ({customers.length}) →
                    </button>
                  </div>

                  {topCustomers.length === 0 ? (
                    <div className="admin-empty" style={{ padding: "26px 10px" }}>
                      <Users size={22} />
                      <b>Buyer leaderboard will track here</b>
                      <span>Top spenders will display here as checkouts occur.</span>
                    </div>
                  ) : (
                    <div className="overview-sellers-list">
                      {topCustomers.map((cust) => {
                        const topPerfume = cust.products_bought[0];
                        return (
                          <div key={cust.id} className="overview-seller-item">
                            <div
                              className="osi-icon"
                              style={{
                                background: cust.tier === "vip" ? "#fef3c7" : "#faede0",
                                color: cust.tier === "vip" ? "#92400e" : "#854d0e",
                              }}
                            >
                              <Crown size={15} />
                            </div>
                            <div className="osi-info">
                              <b>{cust.full_name || "Valued Buyer"}</b>
                              <span>
                                {cust.email}
                                {topPerfume ? ` · Loves ${topPerfume.product_name}` : ""}
                              </span>
                            </div>
                            <div className="osi-metrics">
                              <strong style={{ color: "#9e7740" }}>{money(cust.spent_paise)}</strong>
                              <small>{cust.order_count} orders</small>
                            </div>
                            {cust.whatsapp_url && (
                              <a
                                href={cust.whatsapp_url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-customer-whatsapp"
                                style={{ padding: "4px 8px", fontSize: 9 }}
                                title="WhatsApp VIP buyer"
                              >
                                Chat
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: ORDERS PIPELINE
           ========================================================================= */}
        {tab === "orders" && (
          <div className="admin-panel">
            <div className="admin-panel-tools">
              <div>
                <h2>Customer Orders Pipeline</h2>
                <span style={{ fontSize: 11, color: "#82796d" }}>
                  {filteredOrders.length} orders matching filters · {unfulfilledOrders.length} awaiting dispatch
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label className="admin-filter">
                  <Search size={14} />
                  <input
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Search by Order #, name, phone…"
                    style={{ minWidth: 200 }}
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => setOrderSearch("")}
                      style={{ border: 0, background: "none", cursor: "pointer", padding: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </label>

                <label className="admin-filter">
                  <select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}>
                    <option value="all">All order statuses</option>
                    <option value="paid">Paid (Ready to ship)</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="pending_payment">Payment pending</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </label>
              </div>
            </div>

            {!filteredOrders.length ? (
              <div className="admin-empty">
                <ShoppingBag size={24} />
                <b>No orders match your criteria</b>
                <span>Try clearing the status filter or searching with different terms.</span>
              </div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map((order) => {
                  const totalBottles = order.order_items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                  const isCombo = totalBottles > 1 || order.order_items.length > 1;

                  return (
                    <article className="order-card" key={order.id}>
                      <div className="order-card-head">
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em" }}>
                            {order.order_number}
                          </span>
                          <small>
                            Placed {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </small>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            className="admin-order-label-btn"
                            onClick={() => setSelectedLabelOrder(order)}
                            title="Print 1 consolidated shipping label for this address"
                          >
                            <Printer size={12} />
                            <span>{isCombo ? `Print Combo Label (1 for Address)` : `Print Label`}</span>
                          </button>
                          <div className={`order-status status-${order.status}`}>
                            {order.status.replaceAll("_", " ")}
                          </div>
                        </div>
                      </div>

                      {isCombo && (
                        <div className="admin-combo-strip">
                          <Sparkles size={12} />
                          <strong>Consolidated Fragrance Combo ({totalBottles} Items)</strong>
                          <span>· 1 Single Shipping Label Generated for Address</span>
                        </div>
                      )}

                      <div className="order-card-customer">
                        <div>
                          <b>{order.customer_name}</b>
                          <span>
                            {order.email} · {order.phone}
                          </span>
                        </div>
                        <strong style={{ fontSize: 15, color: "#1f1a14" }}>{money(order.total_paise)}</strong>
                      </div>

                      <div className="order-card-items">
                        {order.order_items.map((item, index) => (
                          <div
                            key={`${order.id}-${index}`}
                            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                          >
                            <span>
                              <b>{item.product_name}</b> · {item.size} × {item.quantity}
                            </span>
                            {item.seller_name && (
                              <span className="order-seller-badge">
                                <Store size={10} /> {item.seller_name}
                              </span>
                            )}
                          </div>
                        ))}
                        {order.discount_paise > 0 && (
                          <span className="order-discount">
                            Coupon {order.coupon_code} · −{money(order.discount_paise)}
                          </span>
                        )}
                      </div>

                      <div className="order-delivery">
                        <span>
                          {order.shipping_address.line1}
                          {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""},{" "}
                          {order.shipping_address.city}, {order.shipping_address.state}{" "}
                          {order.shipping_address.pincode}
                        </span>
                        <span className={`payment-pill payment-${order.payment_status}`}>
                          {order.payment_status.replaceAll("_", " ")}
                        </span>
                      </div>

                      {order.seller_fulfillments && order.seller_fulfillments.length > 0 && (
                        <div className="admin-seller-shipments">
                          {order.seller_fulfillments.map((shipment, index) => (
                            <span key={`${order.id}-seller-${index}`}>
                              <b>{shipment.store_name}</b> · {shipment.status.replaceAll("_", " ")}
                              {shipment.tracking_number ? ` · ${shipment.tracking_number}` : ""}
                              {shipment.tracking_url && (
                                <a href={shipment.tracking_url} target="_blank" rel="noreferrer">
                                  Track
                                </a>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {order.status !== "cancelled" && order.status !== "refunded" && (
                        <div className="order-actions">
                          <label>
                            Order Status
                            <select
                              value={order.status}
                              onChange={(event) => updateOrder(order, event.target.value)}
                            >
                              <option value="paid">Paid</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </label>
                          <label>
                            Courier Carrier
                            <input
                              value={shipments[order.id]?.trackingCarrier ?? order.tracking_carrier ?? ""}
                              onChange={(event) =>
                                setShipments((all) => ({
                                  ...all,
                                  [order.id]: {
                                    ...all[order.id],
                                    trackingCarrier: event.target.value,
                                    trackingNumber: all[order.id]?.trackingNumber ?? order.tracking_number ?? "",
                                    trackingUrl: all[order.id]?.trackingUrl ?? order.tracking_url ?? "",
                                  },
                                }))
                              }
                              placeholder="e.g. BlueDart / Delhivery"
                            />
                          </label>
                          <label>
                            Tracking / AWB #
                            <input
                              value={shipments[order.id]?.trackingNumber ?? order.tracking_number ?? ""}
                              onChange={(event) =>
                                setShipments((all) => ({
                                  ...all,
                                  [order.id]: {
                                    ...all[order.id],
                                    trackingNumber: event.target.value,
                                    trackingCarrier: all[order.id]?.trackingCarrier ?? order.tracking_carrier ?? "",
                                    trackingUrl: all[order.id]?.trackingUrl ?? order.tracking_url ?? "",
                                  },
                                }))
                              }
                              placeholder="AWB / Waybill reference"
                            />
                          </label>
                          <label>
                            Live Tracking Link
                            <input
                              value={shipments[order.id]?.trackingUrl ?? order.tracking_url ?? ""}
                              onChange={(event) =>
                                setShipments((all) => ({
                                  ...all,
                                  [order.id]: {
                                    ...all[order.id],
                                    trackingUrl: event.target.value,
                                    trackingCarrier: all[order.id]?.trackingCarrier ?? order.tracking_carrier ?? "",
                                    trackingNumber: all[order.id]?.trackingNumber ?? order.tracking_number ?? "",
                                  },
                                }))
                              }
                              placeholder="https://track.bluedart.com/…"
                            />
                          </label>
                          <button onClick={() => updateOrder(order)}>
                            <Save size={14} /> Save fulfillment
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: PRODUCT CATALOGUE (WITH SELLER & STOCK FILTERS)
           ========================================================================= */}
        {tab === "products" && (
          <div className="admin-panel">
            <div className="admin-panel-tools">
              <div>
                <h2>Product Catalogue</h2>
                <span style={{ fontSize: 11, color: "#82796d" }}>
                  {filteredProducts.length} fragrances displayed · Total catalogue stock: {totalStock} units
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {/* Search */}
                <label className="admin-filter">
                  <Search size={14} />
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search fragrance, seller…"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch("")}
                      style={{ border: 0, background: "none", cursor: "pointer", padding: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </label>

                {/* Seller Filter */}
                <label className="admin-filter">
                  <select
                    value={productSellerFilter}
                    onChange={(e) => setProductSellerFilter(e.target.value)}
                  >
                    <option value="all">All Fragrances ({products.length})</option>
                    <option value="flovexa">Flovexa Official Only</option>
                    {uniqueSellerNames.map((name) => (
                      <option key={name} value={name}>
                        Seller: {name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Stock Filter */}
                <label className="admin-filter">
                  <select
                    value={productStockFilter}
                    onChange={(e) => setProductStockFilter(e.target.value)}
                  >
                    <option value="all">All Stock Statuses</option>
                    <option value="low">Low Stock (&le; 10)</option>
                    <option value="out">Out of Stock (0)</option>
                    <option value="in">In Stock (&gt; 10)</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Product Add / Edit Modal Form */}
            {formOpen && (
              <form className="product-edit-form" onSubmit={saveProduct}>
                <div className="edit-form-heading">
                  <div>
                    <span className="eyebrow">{selected ? "EDIT PERFUME" : "NEW PERFUME"}</span>
                    <h3>{selected ? selected.name : "Add a perfume"}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setSelected(null);
                    }}
                  >
                    Close <ChevronRight size={15} />
                  </button>
                </div>
                <div className="edit-fields">
                  <label>
                    Product name
                    <input
                      required
                      value={form.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setForm((current) => ({
                          ...current,
                          name,
                          slug: slugTouched ? current.slug : slugFromName(name),
                        }));
                      }}
                    />
                  </label>
                  <label>
                    URL slug
                    <input
                      required
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      value={form.slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        setForm((current) => ({ ...current, slug: slugFromName(event.target.value) }));
                      }}
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={form.category}
                      onChange={(event) => setForm({ ...form, category: event.target.value })}
                    >
                      {categories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Selling price (₹)
                    <input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.price}
                      onChange={(event) => setForm({ ...form, price: event.target.value })}
                      placeholder="2,499"
                    />
                  </label>
                  <label>
                    Regular price (₹) <small>Optional sale price</small>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.compareAtPrice}
                      onChange={(event) => setForm({ ...form, compareAtPrice: event.target.value })}
                      placeholder="Leave blank if not discounted"
                    />
                  </label>
                  <label>
                    Size
                    <input
                      required
                      value={form.size}
                      onChange={(event) => setForm({ ...form, size: event.target.value })}
                    />
                  </label>
                  <label>
                    Concentration
                    <input
                      required
                      value={form.concentration}
                      onChange={(event) => setForm({ ...form, concentration: event.target.value })}
                    />
                  </label>
                  <label>
                    Stock quantity
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(event) => setForm({ ...form, stock: event.target.value })}
                    />
                  </label>
                  <div className="image-upload-row edit-wide">
                    <div className="image-upload-preview">
                      {form.imageUrl ? (
                        <Image
                          src={form.imageUrl}
                          alt={form.name || "Perfume preview"}
                          width={120}
                          height={120}
                          unoptimized
                        />
                      ) : (
                        <div>
                          <ImagePlus size={22} />
                          <span>Photo preview</span>
                        </div>
                      )}
                    </div>
                    <div className="image-upload-controls">
                      <label className="image-upload-button">
                        <ImagePlus size={15} />
                        {uploadingImage ? "Uploading photo…" : form.imageUrl ? "Choose another photo" : "Upload a photo"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingImage}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            void uploadProductImage(file);
                          }}
                        />
                      </label>
                      <span>JPG, PNG or WebP · Max 5 MB</span>
                      <label className="image-url-field">
                        Or paste an image link
                        <input
                          type="url"
                          value={form.imageUrl}
                          onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                          placeholder="https://…"
                        />
                      </label>
                    </div>
                  </div>
                  <label className="edit-wide">
                    Fragrance notes
                    <input
                      required
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      placeholder="Bergamot, rose, sandalwood"
                    />
                  </label>
                  <label className="edit-wide">
                    Description
                    <textarea
                      required
                      rows={3}
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                  </label>
                  <label className="edit-check">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(event) => setForm({ ...form, featured: event.target.checked })}
                    />{" "}
                    Feature on the homepage
                  </label>
                  <label className="edit-check">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) => setForm({ ...form, active: event.target.checked })}
                    />{" "}
                    Visible in the storefront
                  </label>
                </div>
                <button className="admin-primary" disabled={busy || uploadingImage}>
                  <Save size={15} />
                  {busy ? "Saving…" : selected ? "Save changes" : form.active ? "Publish perfume" : "Save as draft"}
                </button>
              </form>
            )}

            {!filteredProducts.length ? (
              <div className="admin-empty">
                <Package size={24} />
                <b>No products match your filters</b>
                <span>Try broadening your search or resetting the seller filter.</span>
                <button onClick={() => openProduct()}>
                  <Plus size={15} /> Add your first perfume
                </button>
              </div>
            ) : (
              <div className="product-admin-list">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock === 0;
                  const isLowStock = product.stock > 0 && product.stock <= 10;

                  return (
                    <article className="product-admin-row" key={product.id}>
                      {/* Product Thumbnail */}
                      <div
                        className="admin-product-swatch"
                        style={{ "--juice": product.accent } as React.CSSProperties}
                      >
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={38}
                            height={42}
                            unoptimized
                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                          />
                        ) : (
                          "F"
                        )}
                      </div>

                      {/* Product Details & Seller Attribution */}
                      <div className="admin-product-title">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <b>{product.name}</b>
                          <span
                            className={
                              product.sellerName && product.sellerName !== "Flovexa Official"
                                ? "admin-seller-badge-merchant"
                                : "admin-seller-badge-official"
                            }
                          >
                            {product.sellerName || "Flovexa Official"}
                          </span>
                        </div>
                        <small>
                          {product.category} · {product.size} ·{" "}
                          <span
                            className={isOutOfStock ? "stock-out-tag" : isLowStock ? "stock-low-tag" : "stock-ok-tag"}
                          >
                            {isOutOfStock ? "Out of Stock" : `${product.stock} in stock`}
                          </span>
                          {(product.unitsSold ?? 0) > 0 && ` · ${product.unitsSold} sold`}
                        </small>
                      </div>

                      <strong>{money(product.pricePaise)}</strong>

                      <span className={product.active ? "product-active" : "product-inactive"}>
                        {product.active ? "Visible" : "Hidden"}
                      </span>

                      <button onClick={() => openProduct(product)}>Edit</button>

                      <button onClick={() => toggleProduct(product)}>
                        {product.active ? "Hide" : "Publish"}
                      </button>

                      <button
                        className="product-delete"
                        disabled={deletingProductId === product.id}
                        onClick={() => void deleteProduct(product)}
                        aria-label={`Delete ${product.name}`}
                        title="Delete perfume"
                      >
                        {deletingProductId === product.id ? "Deleting…" : <><Trash2 size={13} /> Delete</>}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: SELLERS (EMBEDDED RICH COMPONENT)
           ========================================================================= */}
        {tab === "sellers" && sellerPanel}

        {/* =========================================================================
            TAB 5: CUSTOMERS
           ========================================================================= */}
        {tab === "customers" && <AdminCustomers customers={customers} />}

        {/* =========================================================================
            TAB 6: RETURNS
           ========================================================================= */}
        {tab === "returns" && (
          <div className="admin-panel">
            <div className="admin-panel-tools">
              <h2>Customer Return Requests</h2>
              <span>{returnRequests.length} requests on file</span>
            </div>
            {!returnRequests.length ? (
              <div className="admin-empty">
                <Undo2 size={24} />
                <b>No return requests</b>
                <span>Customer requests will appear here for your review.</span>
              </div>
            ) : (
              <div className="orders-list">
                {returnRequests.map((item) => (
                  <article className="order-card" key={item.id}>
                    <div className="order-card-head">
                      <div>
                        <span>{item.order?.order_number ?? `Order ${item.order_id.slice(0, 8)}`}</span>
                        <small>
                          {new Date(item.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </small>
                      </div>
                      <span className="order-status">{item.status.replaceAll("_", " ")}</span>
                    </div>
                    <div className="order-card-customer">
                      <div>
                        <b>{item.order?.customer_name ?? "Customer"}</b>
                        <span>
                          {item.order?.email ?? "Customer account"} · {money(item.order?.total_paise ?? 0)}
                        </span>
                      </div>
                      <strong>{item.reason.replaceAll("_", " ")}</strong>
                    </div>
                    {item.details && <p className="return-admin-details">{item.details}</p>}
                    {["requested", "under_review"].includes(item.status) && (
                      <div className="return-admin-actions">
                        <button onClick={() => void updateReturn(item, "under_review")}>
                          Mark under review
                        </button>
                        <button onClick={() => void updateReturn(item, "approved")}>Approve request</button>
                        <button onClick={() => void updateReturn(item, "declined")}>Decline request</button>
                      </div>
                    )}
                    {item.status === "approved" && (
                      <p className="return-admin-note">
                        Approved. Contact the customer with return instructions and process any refund through Razorpay.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 7: FINANCIAL REPORTS
           ========================================================================= */}
        {tab === "reports" && reportPanel}

        {/* =========================================================================
            TAB 8: PROMOTIONS & COUPONS
           ========================================================================= */}
        {tab === "promotions" && couponPanel}

        {/* =========================================================================
            TAB 9: STOREFRONT CONTENT
           ========================================================================= */}
        {tab === "storefront" && (
          <AdminStorefront
            initialSettings={storefrontSettings}
            initialCategories={categories.map((name, index) => ({ name, sort_order: index * 10, active: true }))}
          />
        )}

        {/* =========================================================================
            TAB 10: CUSTOMER REVIEWS & RATINGS
           ========================================================================= */}
        {tab === "reviews" && (reviewPanel || <AdminReviews initialReviews={reviews} />)}
      </section>

      {/* SINGLE SHIPPING LABEL MODAL (SUPPORTS CONSOLIDATED COMBOS) */}
      {selectedLabelOrder && (
        <ShippingLabelModal
          order={selectedLabelOrder}
          onClose={() => setSelectedLabelOrder(null)}
        />
      )}
    </div>
  );
}
