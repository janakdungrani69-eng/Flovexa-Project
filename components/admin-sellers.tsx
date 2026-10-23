"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  UserCheck,
  X,
} from "lucide-react";

export type SellerProduct = {
  id: string;
  name: string;
  price_paise: number;
  stock: number;
  active: boolean;
  image_url?: string | null;
  category?: string;
};

export type AdminSeller = {
  id: string;
  email: string;
  store_name: string;
  status: "active" | "suspended";
  created_at: string;
  admin_note: string;
  product_count?: number;
  total_stock?: number;
  orders_fulfilled?: number;
  total_sales_paise?: number;
  products?: SellerProduct[];
};

type SellerCandidate = { id: string; email: string; full_name: string };

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

export default function AdminSellers({
  initialSellers,
  initialCustomers,
  onFilterProductsBySeller,
}: {
  initialSellers: AdminSeller[];
  initialCustomers: SellerCandidate[];
  onFilterProductsBySeller?: (sellerName: string) => void;
}) {
  const [sellers, setSellers] = useState(initialSellers);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState(initialCustomers[0]?.id ?? "");
  const [storeName, setStoreName] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [creatingSeller, setCreatingSeller] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "active" | "suspended">("all");
  const [expandedSellerId, setExpandedSellerId] = useState<string | null>(null);

  // Grouping
  const pendingSellers = useMemo(
    () => sellers.filter((s) => s.status === "suspended" && s.admin_note?.includes("PENDING_APPROVAL")),
    [sellers]
  );
  const activeSellers = useMemo(() => sellers.filter((s) => s.status === "active"), [sellers]);
  const suspendedSellers = useMemo(
    () => sellers.filter((s) => s.status === "suspended" && !s.admin_note?.includes("PENDING_APPROVAL")),
    [sellers]
  );

  // Aggregate Metrics across all sellers
  const totalSellerProducts = sellers.reduce((acc, s) => acc + (s.product_count ?? 0), 0);
  const totalSellerStock = sellers.reduce((acc, s) => acc + (s.total_stock ?? 0), 0);
  const totalSellerSalesPaise = sellers.reduce((acc, s) => acc + (s.total_sales_paise ?? 0), 0);
  const totalFulfilledUnits = sellers.reduce((acc, s) => acc + (s.orders_fulfilled ?? 0), 0);

  // Filtered sellers by search and active tab
  const displayedSellers = useMemo(() => {
    let list = sellers;
    if (filterTab === "pending") list = pendingSellers;
    else if (filterTab === "active") list = activeSellers;
    else if (filterTab === "suspended") list = suspendedSellers;

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.store_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.admin_note && s.admin_note.toLowerCase().includes(q))
    );
  }, [sellers, filterTab, pendingSellers, activeSellers, suspendedSellers, search]);

  async function addSeller(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingSeller(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customerId, storeName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not grant seller access.");
      setSellers((current) => [
        {
          ...result.seller,
          product_count: 0,
          total_stock: 0,
          orders_fulfilled: 0,
          total_sales_paise: 0,
          products: [],
        },
        ...current,
      ]);
      const remaining = customers.filter((customer) => customer.id !== customerId);
      setCustomers(remaining);
      setCustomerId(remaining[0]?.id ?? "");
      setStoreName("");
      setMessage(`Seller access granted to ${result.seller.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not grant seller access.");
    } finally {
      setCreatingSeller(false);
    }
  }

  async function approveSeller(seller: AdminSeller) {
    setBusyId(seller.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not approve seller.");
      setSellers((current) =>
        current.map((item) =>
          item.id === seller.id
            ? { ...item, status: "active", admin_note: result.admin_note || "Approved by owner" }
            : item
        )
      );
      setMessage(`Permission granted! "${seller.store_name || seller.email}" is now an active seller.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not approve seller.");
    } finally {
      setBusyId("");
    }
  }

  async function rejectSeller(seller: AdminSeller) {
    if (
      !window.confirm(
        `Are you sure you want to reject the seller application for "${seller.store_name || seller.email}"?`
      )
    ) {
      return;
    }
    setBusyId(seller.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not reject application.");
      setSellers((current) =>
        current.map((item) =>
          item.id === seller.id
            ? { ...item, status: "suspended", admin_note: "REJECTED: Application rejected by owner" }
            : item
        )
      );
      setMessage(`Application for "${seller.store_name || seller.email}" has been rejected.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reject application.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleActiveStatus(seller: AdminSeller) {
    const nextStatus = seller.status === "active" ? "suspended" : "active";
    setBusyId(seller.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update seller access.");
      setSellers((current) =>
        current.map((item) =>
          item.id === seller.id ? { ...item, status: nextStatus, admin_note: result.admin_note } : item
        )
      );
      setMessage(
        `${seller.store_name || seller.email} access ${nextStatus === "active" ? "restored" : "paused"}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update seller access.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-panel admin-seller-panel">
      {/* Top Header & Overview KPI Cards */}
      <div className="admin-panel-tools">
        <div>
          <h2>Marketplace Seller Command Center</h2>
          <span style={{ fontSize: 11, color: "#82796d" }}>
            Monitor merchant stores, inventory holdings, order dispatches, and sales across Flovexa.
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="seller-access-state active" style={{ borderRadius: 6, fontWeight: 600 }}>
            {activeSellers.length} Active Stores
          </span>
          {pendingSellers.length > 0 && (
            <span
              className="seller-access-state suspended"
              style={{
                borderRadius: 6,
                fontWeight: 600,
                background: "#fde8d7",
                color: "#9f531d",
                animation: "pulse 2s infinite",
              }}
            >
              ⚠️ {pendingSellers.length} Awaiting Approval
            </span>
          )}
        </div>
      </div>

      {message && (
        <div className="admin-message" role="status">
          <Check size={15} />
          {message}
        </div>
      )}

      {/* KPI Cockpit */}
      <div className="admin-seller-kpis">
        <div className="seller-kpi-card">
          <span>
            <Store size={14} /> REGISTERED MERCHANTS
          </span>
          <b>{sellers.length}</b>
          <small>
            {activeSellers.length} active · {pendingSellers.length} pending · {suspendedSellers.length} paused
          </small>
        </div>
        <div className="seller-kpi-card">
          <span>
            <Boxes size={14} /> MERCHANT CATALOGUE
          </span>
          <b>{totalSellerProducts}</b>
          <small>{totalSellerStock} total units in seller stock</small>
        </div>
        <div className="seller-kpi-card">
          <span>
            <ShoppingBag size={14} /> UNITS SOLD &amp; DISPATCHED
          </span>
          <b>{totalFulfilledUnits}</b>
          <small>Dispatched across all sellers</small>
        </div>
        <div className="seller-kpi-card">
          <span>
            <TrendingUp size={14} /> GROSS MERCHANT SALES
          </span>
          <b>{money(totalSellerSalesPaise)}</b>
          <small>Marketplace gross volume (INR)</small>
        </div>
      </div>

      {/* Strict Owner Permission Notice */}
      <div className="seller-admin-guidance-box">
        <ShieldCheck size={18} style={{ color: "#aa8050", flexShrink: 0 }} />
        <div>
          <strong>Owner Authority Rule:</strong>
          <span>
            {" "}
            Flovexa enforces direct merchant review. No vendor can access Seller Central or publish fragrances
            without your explicit approval below.
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="seller-filter-toolbar">
        <div className="seller-filter-tabs">
          <button
            type="button"
            className={filterTab === "all" ? "active" : ""}
            onClick={() => setFilterTab("all")}
          >
            All Merchants ({sellers.length})
          </button>
          <button
            type="button"
            className={filterTab === "pending" ? "active" : ""}
            onClick={() => setFilterTab("pending")}
          >
            Awaiting Review
            {pendingSellers.length > 0 && <span className="tab-pill-badge">{pendingSellers.length}</span>}
          </button>
          <button
            type="button"
            className={filterTab === "active" ? "active" : ""}
            onClick={() => setFilterTab("active")}
          >
            Active Stores ({activeSellers.length})
          </button>
          <button
            type="button"
            className={filterTab === "suspended" ? "active" : ""}
            onClick={() => setFilterTab("suspended")}
          >
            Paused / Denied ({suspendedSellers.length})
          </button>
        </div>

        <div className="admin-filter" style={{ minWidth: 260 }}>
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store name, email…"
            style={{ width: "100%", maxWidth: "none" }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ border: 0, background: "none", cursor: "pointer", padding: 0 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Seller Cards List */}
      <div className="seller-cards-container">
        {displayedSellers.length === 0 ? (
          <div className="admin-empty" style={{ padding: "40px 20px" }}>
            <Store size={28} />
            <b>No sellers found matching criteria</b>
            <span>Try selecting another filter tab or clearing your search query.</span>
          </div>
        ) : (
          displayedSellers.map((seller) => {
            const isPending = seller.status === "suspended" && seller.admin_note?.includes("PENDING_APPROVAL");
            const isSuspended = seller.status === "suspended" && !isPending;
            const isExpanded = expandedSellerId === seller.id;
            const sellerProducts = seller.products ?? [];

            return (
              <article
                key={seller.id}
                className={`seller-monitoring-card ${isPending ? "is-pending" : isSuspended ? "is-suspended" : "is-active"}`}
              >
                {/* Header row */}
                <div className="smc-header">
                  <div className="smc-brand">
                    <div className="smc-icon">
                      <Store size={20} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h3 className="smc-name">{seller.store_name || "Merchant Store"}</h3>
                        {isPending ? (
                          <span className="smc-badge badge-pending">
                            <Clock size={11} /> Application Pending
                          </span>
                        ) : seller.status === "active" ? (
                          <span className="smc-badge badge-active">
                            <ShieldCheck size={11} /> Active Merchant
                          </span>
                        ) : (
                          <span className="smc-badge badge-suspended">
                            <ShieldAlert size={11} /> Access Paused
                          </span>
                        )}
                      </div>
                      <div className="smc-meta">
                        <span>{seller.email}</span>
                        <span>·</span>
                        <span>
                          Joined {new Date(seller.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="smc-actions">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          className="btn-approve-seller"
                          disabled={busyId === seller.id}
                          onClick={() => void approveSeller(seller)}
                        >
                          <ShieldCheck size={14} />
                          {busyId === seller.id ? "Approving…" : "Approve & Grant Access"}
                        </button>
                        <button
                          type="button"
                          className="btn-reject-seller"
                          disabled={busyId === seller.id}
                          onClick={() => void rejectSeller(seller)}
                        >
                          <X size={14} />
                          {busyId === seller.id ? "Rejecting…" : "Deny"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={seller.status === "active" ? "btn-pause-access" : "btn-restore-access"}
                          disabled={busyId === seller.id}
                          onClick={() => void toggleActiveStatus(seller)}
                        >
                          {seller.status === "active" ? (
                            <>
                              <Shield size={13} />
                              {busyId === seller.id ? "Updating…" : "Pause Access"}
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={13} />
                              {busyId === seller.id ? "Updating…" : "Restore Access"}
                            </>
                          )}
                        </button>

                        {seller.product_count && seller.product_count > 0 ? (
                          <button
                            type="button"
                            className="btn-view-products"
                            onClick={() => setExpandedSellerId(isExpanded ? null : seller.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={13} /> Hide Fragrances
                              </>
                            ) : (
                              <>
                                <ChevronDown size={13} /> View {seller.product_count} Fragrances
                              </>
                            )}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                {/* Seller stats metric strip */}
                <div className="smc-stats-grid">
                  <div className="smc-stat-box">
                    <span className="smc-stat-label">Listed Products</span>
                    <strong className="smc-stat-val">{seller.product_count ?? 0}</strong>
                    <span className="smc-stat-sub">Perfume listings</span>
                  </div>
                  <div className="smc-stat-box">
                    <span className="smc-stat-label">Total Stock Held</span>
                    <strong className="smc-stat-val">{seller.total_stock ?? 0}</strong>
                    <span className="smc-stat-sub">Bottles ready to ship</span>
                  </div>
                  <div className="smc-stat-box">
                    <span className="smc-stat-label">Units Fulfilled</span>
                    <strong className="smc-stat-val">{seller.orders_fulfilled ?? 0}</strong>
                    <span className="smc-stat-sub">Items delivered</span>
                  </div>
                  <div className="smc-stat-box">
                    <span className="smc-stat-label">Gross Sales Generated</span>
                    <strong className="smc-stat-val" style={{ color: "#9e7740" }}>
                      {money(seller.total_sales_paise ?? 0)}
                    </strong>
                    <span className="smc-stat-sub">Store revenue</span>
                  </div>
                </div>

                {/* Notes if any */}
                {seller.admin_note && (
                  <div className="smc-note-strip">
                    <small>
                      <b>Note / History:</b> {seller.admin_note}
                    </small>
                  </div>
                )}

                {/* Collapsible Product Drawer */}
                {isExpanded && (
                  <div className="smc-products-drawer">
                    <div className="smc-drawer-head">
                      <h4>
                        Fragrances Listed by {seller.store_name} ({sellerProducts.length})
                      </h4>
                      {onFilterProductsBySeller && (
                        <button
                          type="button"
                          className="smc-filter-all-btn"
                          onClick={() => onFilterProductsBySeller(seller.store_name)}
                        >
                          <Eye size={12} /> Open in Catalogue Tab
                        </button>
                      )}
                    </div>

                    {sellerProducts.length === 0 ? (
                      <p style={{ color: "#82796d", fontSize: 12, padding: "10px 0" }}>
                        No fragrances listed yet by this seller.
                      </p>
                    ) : (
                      <div className="smc-product-table">
                        {sellerProducts.map((p) => (
                          <div key={p.id} className="smc-prod-row">
                            <div className="smc-prod-img">
                              {p.image_url ? (
                                <Image
                                  src={p.image_url}
                                  alt={p.name}
                                  width={40}
                                  height={40}
                                  unoptimized
                                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                />
                              ) : (
                                <span>F</span>
                              )}
                            </div>
                            <div className="smc-prod-info">
                              <b>{p.name}</b>
                              <small>{p.category || "Unisex"}</small>
                            </div>
                            <div className="smc-prod-price">
                              <strong>{money(p.price_paise)}</strong>
                            </div>
                            <div className="smc-prod-stock">
                              <span className={p.stock <= 5 ? "stock-warn" : "stock-ok"}>
                                {p.stock === 0 ? "Out of Stock" : `${p.stock} in stock`}
                              </span>
                            </div>
                            <div className="smc-prod-status">
                              <span className={p.active ? "product-active" : "product-inactive"}>
                                {p.active ? "Live in Store" : "Hidden"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Manual Grant Access Form */}
      <div className="admin-section-divider" style={{ marginTop: 32 }}>
        <h4>Direct Seller Provisioning</h4>
        <p style={{ margin: "4px 0 0", color: "#82796d", fontSize: 11 }}>
          Grant merchant selling permissions to any registered customer account.
        </p>
      </div>

      <form className="seller-provision-form" onSubmit={addSeller}>
        <label>
          Customer account
          <select
            required
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            disabled={!customers.length || creatingSeller}
          >
            <option value="">
              {customers.length ? "Choose a registered customer" : "No eligible customer accounts"}
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name ? `${customer.full_name} · ` : ""}
                {customer.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seller store name
          <input
            required
            minLength={2}
            maxLength={100}
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="e.g. Royal Oudh Atelier"
            disabled={!customers.length || creatingSeller}
          />
        </label>
        <button
          className="admin-primary"
          type="submit"
          disabled={!customers.length || creatingSeller}
        >
          <Plus size={14} />
          {creatingSeller ? "Granting…" : "Authorize & Grant Access"}
        </button>
      </form>
    </div>
  );
}
