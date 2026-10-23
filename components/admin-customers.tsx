"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  ExternalLink,
  Flame,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Repeat,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

export type CustomerProductPurchase = {
  product_id?: string | null;
  product_name: string;
  size: string;
  total_quantity: number; // Kitni bar kharida (purchase count / bottles bought)
  total_spent_paise: number;
  last_purchased_at: string;
};

export type CustomerOrderRecord = {
  id: string;
  order_number: string;
  total_paise: number;
  status: string;
  payment_status: string;
  created_at: string;
  items: { product_name: string; size: string; quantity: number }[];
  address_snippet?: string;
};

export type CustomerAddressRecord = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type AdminCustomer = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  gender?: string;
  created_at: string;
  last_sign_in_at: string | null;
  order_count: number;
  spent_paise: number;
  aov_paise?: number;
  last_order_at?: string | null;
  days_since_last_order?: number | null;
  admin_note: string;
  tier: "vip" | "repeat" | "active" | "lead" | "guest";
  is_guest?: boolean;
  products_bought: CustomerProductPurchase[];
  recent_orders: CustomerOrderRecord[];
  addresses: CustomerAddressRecord[];
  whatsapp_url?: string;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

export default function AdminCustomers({ customers: initialCustomers }: { customers: AdminCustomer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "vip" | "repeat" | "active" | "leads">("all");
  const [sortBy, setSortBy] = useState<"spend" | "orders" | "recent" | "oldest">("spend");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  // Segment Counts
  const vipCustomers = useMemo(() => customers.filter((c) => c.tier === "vip"), [customers]);
  const repeatCustomers = useMemo(() => customers.filter((c) => c.tier === "repeat"), [customers]);
  const activeCustomers = useMemo(() => customers.filter((c) => c.tier === "active"), [customers]);
  const leadCustomers = useMemo(() => customers.filter((c) => c.tier === "lead"), [customers]);

  // Aggregate Metrics
  const totalLtvPaise = useMemo(() => customers.reduce((acc, c) => acc + c.spent_paise, 0), [customers]);
  const totalOrdersPlaced = useMemo(() => customers.reduce((acc, c) => acc + c.order_count, 0), [customers]);
  const buyersWithOrders = useMemo(() => customers.filter((c) => c.order_count > 0).length, [customers]);

  // Filtered & Sorted Customer List
  const displayedCustomers = useMemo(() => {
    let list = customers;

    if (filterTab === "vip") list = vipCustomers;
    else if (filterTab === "repeat") list = repeatCustomers;
    else if (filterTab === "active") list = activeCustomers;
    else if (filterTab === "leads") list = leadCustomers;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((c) => {
        const basicMatch =
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.gender && c.gender.toLowerCase().includes(q)) ||
          c.addresses.some((a) => `${a.city} ${a.state} ${a.pincode}`.toLowerCase().includes(q));

        if (basicMatch) return true;

        // Also search by product name they bought (e.g., searching "Oud" reveals buyers who bought Oud!)
        const productMatch = c.products_bought.some((p) => p.product_name.toLowerCase().includes(q));
        return productMatch;
      });
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === "spend") return b.spent_paise - a.spent_paise;
      if (sortBy === "orders") return b.order_count - a.order_count;
      if (sortBy === "recent") {
        const timeA = a.last_order_at ? new Date(a.last_order_at).getTime() : new Date(a.created_at).getTime();
        const timeB = b.last_order_at ? new Date(b.last_order_at).getTime() : new Date(b.created_at).getTime();
        return timeB - timeA;
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });
  }, [customers, filterTab, vipCustomers, repeatCustomers, activeCustomers, leadCustomers, search, sortBy]);

  async function saveNote(customer: AdminCustomer) {
    setBusyId(customer.id);
    setMessage("");
    try {
      const noteToSave = notes[customer.id] ?? customer.admin_note;
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteToSave }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save customer note.");
      setCustomers((current) =>
        current.map((item) => (item.id === customer.id ? { ...item, admin_note: noteToSave } : item))
      );
      setMessage(`Internal note saved for ${customer.full_name || customer.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save customer note.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-panel admin-customers-panel">
      {/* Top Header */}
      <div className="admin-panel-tools">
        <div>
          <h2>Customer CRM &amp; Buyer Purchase Intelligence</h2>
          <span style={{ fontSize: 11, color: "#82796d" }}>
            Track registered member accounts, buyer purchase frequency, favorite perfumes, and lifetime value.
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="seller-access-state active" style={{ borderRadius: 6, fontWeight: 600 }}>
            {buyersWithOrders} Active Buyers
          </span>
          {leadCustomers.length > 0 && (
            <span
              className="seller-access-state suspended"
              style={{ borderRadius: 6, fontWeight: 600, background: "#e0e7ff", color: "#3730a3" }}
              title="Registered in store but haven't placed an order yet"
            >
              {leadCustomers.length} New Members to Convert
            </span>
          )}
        </div>
      </div>

      {message && (
        <div className="admin-message" role="status" style={{ margin: "14px 20px 0" }}>
          <Check size={15} />
          {message}
        </div>
      )}

      {/* 4 Customer Intelligence KPI Cards */}
      <div className="admin-customer-kpis">
        <div className="customer-kpi-card">
          <span>
            <Users size={14} /> TOTAL ACCOUNTS &amp; BUYERS
          </span>
          <b>{customers.length}</b>
          <small>
            {buyersWithOrders} buyers with orders · {leadCustomers.length} registered leads
          </small>
        </div>

        <div className="customer-kpi-card">
          <span>
            <Crown size={14} style={{ color: "#d97706" }} /> LOYAL VIP &amp; REPEAT BUYERS
          </span>
          <b>{vipCustomers.length + repeatCustomers.length}</b>
          <small>
            {vipCustomers.length} VIP connoisseurs · {repeatCustomers.length} repeat purchasers
          </small>
        </div>

        <div className="customer-kpi-card">
          <span>
            <TrendingUp size={14} /> LIFETIME CUSTOMER REVENUE
          </span>
          <b>{money(totalLtvPaise)}</b>
          <small>
            {totalOrdersPlaced} orders fulfilled · AOV {money(totalOrdersPlaced ? totalLtvPaise / totalOrdersPlaced : 0)}
          </small>
        </div>

        <div className="customer-kpi-card">
          <span>
            <UserPlus size={14} style={{ color: "#4338ca" }} /> REGISTERED STORE LEADS
          </span>
          <b>{leadCustomers.length}</b>
          <small>Signed up on store · Ready for WhatsApp greeting &amp; coupon</small>
        </div>
      </div>

      {/* Guidance Note for Business Growth */}
      <div className="customer-growth-guidance">
        <Sparkles size={18} style={{ color: "#aa8050", flexShrink: 0 }} />
        <div>
          <strong>D2C Growth &amp; Repeat Purchase Engine:</strong>
          <span>
            {" "}
            Click the green <strong>WhatsApp</strong> button on any customer to connect instantly with a personalized
            greeting. Use the <strong>"Fragrances Purchased"</strong> dropdown to see exactly which perfume each buyer
            purchased and how many times they re-ordered.
          </span>
        </div>
      </div>

      {/* Filter Tabs, Search & Sort Toolbar */}
      <div className="customer-filter-toolbar">
        <div className="customer-filter-tabs">
          <button
            type="button"
            className={filterTab === "all" ? "active" : ""}
            onClick={() => setFilterTab("all")}
          >
            All Accounts ({customers.length})
          </button>
          <button
            type="button"
            className={filterTab === "vip" ? "active" : ""}
            onClick={() => setFilterTab("vip")}
          >
            <Crown size={12} style={{ color: "#d97706" }} /> VIP Connoisseurs ({vipCustomers.length})
          </button>
          <button
            type="button"
            className={filterTab === "repeat" ? "active" : ""}
            onClick={() => setFilterTab("repeat")}
          >
            <Repeat size={12} /> Repeat Buyers ({repeatCustomers.length})
          </button>
          <button
            type="button"
            className={filterTab === "active" ? "active" : ""}
            onClick={() => setFilterTab("active")}
          >
            <ShoppingBag size={12} /> 1-Time Buyers ({activeCustomers.length})
          </button>
          <button
            type="button"
            className={filterTab === "leads" ? "active" : ""}
            onClick={() => setFilterTab("leads")}
          >
            <UserPlus size={12} /> New Leads ({leadCustomers.length})
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div className="admin-filter" style={{ minWidth: 240 }}>
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, city, scent…"
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

          {/* Sort */}
          <div className="admin-filter">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{ fontSize: 10 }}
            >
              <option value="spend">Sort: Highest Lifetime Spend</option>
              <option value="orders">Sort: Most Orders</option>
              <option value="recent">Sort: Recently Active</option>
              <option value="oldest">Sort: Oldest Registered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Directory List */}
      <div className="customer-directory-list">
        {displayedCustomers.length === 0 ? (
          <div className="admin-empty" style={{ padding: "40px 20px" }}>
            <Users size={28} />
            <b>No customers found</b>
            <span>Try searching with a different name, email, city or perfume name.</span>
          </div>
        ) : (
          displayedCustomers.map((customer) => {
            const isExpanded = expandedCustomerId === customer.id;
            const cleanPhone = customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "");
            const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const whatsappLink =
              customer.whatsapp_url ||
              (cleanPhone
                ? `https://wa.me/${fullPhone}?text=Hello%20${encodeURIComponent(
                    customer.full_name || "Customer"
                  )},%20greetings%20from%20Flovexa%20Perfumes!`
                : undefined);

            const totalPerfumesPurchased = customer.products_bought.reduce(
              (sum, item) => sum + item.total_quantity,
              0
            );

            return (
              <article key={customer.id} className={`customer-card-luxury tier-${customer.tier}`}>
                {/* Header Row */}
                <div className="ccl-header">
                  <div className="ccl-identity">
                    <div className="ccl-avatar">
                      {customer.full_name ? customer.full_name.slice(0, 1).toUpperCase() : "C"}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h3 className="ccl-name">{customer.full_name || "Flovexa Customer"}</h3>

                        {/* Customer Tier Pill */}
                        {customer.tier === "vip" ? (
                          <span className="ccl-tier-badge tier-badge-vip">
                            <Crown size={11} /> VIP Connoisseur
                          </span>
                        ) : customer.tier === "repeat" ? (
                          <span className="ccl-tier-badge tier-badge-repeat">
                            <Repeat size={11} /> Repeat Buyer ({customer.order_count} Orders)
                          </span>
                        ) : customer.tier === "active" ? (
                          <span className="ccl-tier-badge tier-badge-active">
                            <ShoppingBag size={11} /> 1-Time Buyer
                          </span>
                        ) : customer.tier === "guest" ? (
                          <span className="ccl-tier-badge tier-badge-guest">Guest Buyer</span>
                        ) : (
                          <span className="ccl-tier-badge tier-badge-lead">
                            <UserPlus size={11} /> Registered Lead (No Order Yet)
                          </span>
                        )}

                        {customer.gender && customer.gender !== "prefer_not_to_say" && (
                          <span className="ccl-gender-badge">{customer.gender}</span>
                        )}
                      </div>

                      <div className="ccl-contact-row">
                        <span className="ccl-email">{customer.email}</span>
                        {customer.phone && (
                          <>
                            <span>·</span>
                            <span className="ccl-phone">{customer.phone}</span>
                          </>
                        )}
                        <span>·</span>
                        <span className="ccl-date">
                          Joined {new Date(customer.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </span>
                        {customer.last_sign_in_at && (
                          <>
                            <span>·</span>
                            <span className="ccl-date">
                              Active {new Date(customer.last_sign_in_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="ccl-actions">
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-customer-whatsapp"
                        title="Chat on WhatsApp with this customer"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}

                    <a
                      href={`mailto:${customer.email}`}
                      className="btn-customer-email"
                      title="Send email to customer"
                    >
                      <Mail size={13} /> Email
                    </a>

                    {customer.order_count > 0 && (
                      <button
                        type="button"
                        className="btn-customer-history"
                        onClick={() => setExpandedCustomerId(isExpanded ? null : customer.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={13} /> Hide History
                          </>
                        ) : (
                          <>
                            <ChevronDown size={13} /> Purchase History ({customer.products_bought.length} Scents)
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics 4-Box Strip */}
                <div className="ccl-metrics-grid">
                  <div className="ccl-metric-box">
                    <span className="ccl-metric-label">Total Orders</span>
                    <strong className="ccl-metric-val">{customer.order_count}</strong>
                    <span className="ccl-metric-sub">
                      {customer.order_count === 0 ? "No purchases yet" : `${totalPerfumesPurchased} bottles bought`}
                    </span>
                  </div>

                  <div className="ccl-metric-box">
                    <span className="ccl-metric-label">Lifetime Spend (LTV)</span>
                    <strong className="ccl-metric-val" style={{ color: "#9e7740" }}>
                      {money(customer.spent_paise)}
                    </strong>
                    <span className="ccl-metric-sub">Captured revenue</span>
                  </div>

                  <div className="ccl-metric-box">
                    <span className="ccl-metric-label">Avg Order Value (AOV)</span>
                    <strong className="ccl-metric-val">
                      {money(customer.aov_paise ?? (customer.order_count ? customer.spent_paise / customer.order_count : 0))}
                    </strong>
                    <span className="ccl-metric-sub">Per checkout</span>
                  </div>

                  <div className="ccl-metric-box">
                    <span className="ccl-metric-label">Recency</span>
                    <strong className="ccl-metric-val" style={{ fontSize: 13, marginTop: 3 }}>
                      {customer.last_order_at
                        ? new Date(customer.last_order_at).toLocaleDateString("en-IN", { dateStyle: "medium" })
                        : "Never ordered"}
                    </strong>
                    <span className="ccl-metric-sub">
                      {customer.days_since_last_order !== null && customer.days_since_last_order !== undefined
                        ? customer.days_since_last_order === 0
                          ? "Ordered today!"
                          : `${customer.days_since_last_order} days ago`
                        : "New registered member"}
                    </span>
                  </div>
                </div>

                {/* Collapsible Purchase History & Products Breakdown Drawer */}
                {isExpanded && (
                  <div className="ccl-drawer">
                    {/* 1. WHICH PRODUCTS & HOW MANY TIMES PURCHASED */}
                    <div className="ccl-drawer-section">
                      <div className="ccl-section-head">
                        <Flame size={15} style={{ color: "#d97706" }} />
                        <h4>
                          Perfumes Purchased by {customer.full_name || "this buyer"} (
                          {customer.products_bought.length} Fragrances · {totalPerfumesPurchased} Total Bottles)
                        </h4>
                      </div>

                      {customer.products_bought.length === 0 ? (
                        <p style={{ color: "#82796d", fontSize: 12, margin: "6px 0" }}>
                          No individual product records found.
                        </p>
                      ) : (
                        <div className="ccl-products-table">
                          <div className="ccl-table-header">
                            <span>Perfume Name &amp; Size</span>
                            <span style={{ textAlign: "center" }}>Times Purchased (Bottles)</span>
                            <span style={{ textAlign: "right" }}>Total Spend</span>
                            <span style={{ textAlign: "right" }}>Last Purchased</span>
                          </div>

                          {customer.products_bought.map((item, idx) => (
                            <div key={`${customer.id}-prod-${idx}`} className="ccl-product-row">
                              <div className="ccl-prod-name">
                                <b>{item.product_name}</b>
                                <small>{item.size}</small>
                              </div>

                              <div className="ccl-prod-qty">
                                <span className={item.total_quantity > 1 ? "qty-repeat-pill" : "qty-single-pill"}>
                                  {item.total_quantity > 1 ? (
                                    <>
                                      <Repeat size={10} /> Bought {item.total_quantity} Times
                                    </>
                                  ) : (
                                    `Bought 1 Time`
                                  )}
                                </span>
                              </div>

                              <div className="ccl-prod-spent">
                                <strong>{money(item.total_spent_paise)}</strong>
                              </div>

                              <div className="ccl-prod-date">
                                <span>
                                  {new Date(item.last_purchased_at).toLocaleDateString("en-IN", {
                                    dateStyle: "medium",
                                  })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. RECENT ORDERS LIST */}
                    {customer.recent_orders && customer.recent_orders.length > 0 && (
                      <div className="ccl-drawer-section" style={{ marginTop: 16 }}>
                        <div className="ccl-section-head">
                          <ShoppingBag size={15} style={{ color: "#aa8050" }} />
                          <h4>Order History ({customer.recent_orders.length} Orders)</h4>
                        </div>

                        <div className="ccl-orders-subtable">
                          {customer.recent_orders.map((ord) => (
                            <div key={ord.id} className="ccl-order-subrow">
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="ccl-ord-num">{ord.order_number}</span>
                                <span className={`order-status status-${ord.status}`}>{ord.status}</span>
                              </div>
                              <div className="ccl-ord-items">
                                {ord.items.map((i, iIdx) => (
                                  <span key={iIdx}>
                                    {i.product_name} ({i.size}) × {i.quantity}
                                  </span>
                                ))}
                              </div>
                              <strong className="ccl-ord-total">{money(ord.total_paise)}</strong>
                              <span className="ccl-ord-date">
                                {new Date(ord.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. SHIPPING ADDRESSES USED */}
                    {customer.addresses && customer.addresses.length > 0 && (
                      <div className="ccl-drawer-section" style={{ marginTop: 16 }}>
                        <div className="ccl-section-head">
                          <MapPin size={15} style={{ color: "#aa8050" }} />
                          <h4>Delivery Locations Used ({customer.addresses.length})</h4>
                        </div>

                        <div className="ccl-addresses-grid">
                          {customer.addresses.map((addr, aIdx) => (
                            <div key={aIdx} className="ccl-address-card">
                              <span>
                                {addr.line1}
                                {addr.line2 ? `, ${addr.line2}` : ""},{" "}
                                <b>
                                  {addr.city}, {addr.state} — {addr.pincode}
                                </b>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Internal Admin Note */}
                <div className="ccl-note-box">
                  <label className="customer-note-field">
                    <span>
                      Private internal store note for <b>{customer.full_name || customer.email}</b>
                    </span>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={notes[customer.id] ?? customer.admin_note}
                      onChange={(event) =>
                        setNotes((all) => ({ ...all, [customer.id]: event.target.value }))
                      }
                      placeholder="e.g. Loves woody oud fragrances; VIP client; prefers morning deliveries..."
                    />
                  </label>
                  <button
                    className="customer-note-save"
                    disabled={busyId === customer.id}
                    onClick={() => void saveNote(customer)}
                  >
                    <Save size={13} />
                    {busyId === customer.id ? "Saving…" : "Save Note"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
