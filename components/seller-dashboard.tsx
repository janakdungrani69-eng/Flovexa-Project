"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeIndianRupee, Check, ChevronRight, ClipboardList, Package, Plus, Save, Store, Undo2 } from "lucide-react";

type SellerProduct = {
  id: string; slug: string; name: string; category: string; pricePaise: number; compareAtPaise?: number;
  size: string; concentration: string; notes: string[]; description: string; imageUrl?: string;
  accent: string; stock: number; active: boolean; createdAt: string;
};
type ProductForm = {
  name: string; slug: string; category: string; price: string; compareAtPrice: string; size: string;
  concentration: string; notes: string; description: string; imageUrl: string; accent: string; stock: string; active: boolean;
};
type SellerOrderItem = { product_name: string; size: string; unit_price_paise: number; quantity: number; line_total_paise: number };
type SellerOrder = {
  id: string; order_number: string; customer_name: string; phone: string;
  shipping_address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  status: string; created_at: string; order_items: SellerOrderItem[];
  fulfillment: { status: string; tracking_carrier: string | null; tracking_number: string | null; tracking_url: string | null };
};
type SellerReturn = { id: string; order_id: string; order_number: string; customer_name: string; reason: string; details: string; status: string; created_at: string };

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const blankForm = (category: string): ProductForm => ({ name: "", slug: "", category, price: "", compareAtPrice: "", size: "50 ml", concentration: "Eau de Parfum", notes: "", description: "", imageUrl: "", accent: "#ad7045", stock: "0", active: false });
const slugify = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 140);
const transitions: Record<string, string[]> = { paid: ["processing"], processing: ["shipped"], shipped: ["delivered"], delivered: [] };

export default function SellerDashboard({ storeName, initialProducts, categories }: { storeName: string; initialProducts: SellerProduct[]; categories: string[] }) {
  const [tab, setTab] = useState<"products" | "orders" | "returns" | "earnings">("products");
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [returns, setReturns] = useState<SellerReturn[]>([]);
  const [grossSales, setGrossSales] = useState(0);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [form, setForm] = useState<ProductForm>(() => blankForm(categories[0] ?? "Unisex"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingFulfillment, setSavingFulfillment] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; trackingCarrier: string; trackingNumber: string; trackingUrl: string }>>({});
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const activeProducts = useMemo(() => products.filter((product) => product.active).length, [products]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/seller/orders", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load Seller orders.");
      if (cancelled) return;
      setOrders(data.orders ?? []);
      setReturns(data.returns ?? []);
      setGrossSales(data.grossSalesPaise ?? 0);
      setOrdersLoaded(true);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setOrdersError(error instanceof Error ? error.message : "Could not load Seller orders.");
      setOrdersLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  function beginAdd() {
    setEditingId(null);
    setForm(blankForm(categories[0] ?? "Unisex"));
    setFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  function beginEdit(product: SellerProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name, slug: product.slug, category: product.category, price: String(product.pricePaise / 100),
      compareAtPrice: product.compareAtPaise ? String(product.compareAtPaise / 100) : "", size: product.size,
      concentration: product.concentration, notes: product.notes.join(", "), description: product.description,
      imageUrl: product.imageUrl ?? "", accent: product.accent, stock: String(product.stock), active: product.active,
    });
    setFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setErrorMessage("");
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}), ...form, price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null, stock: Number(form.stock), slug: slugify(form.slug),
      };
      const response = await fetch("/api/seller/products", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this perfume.");
      const product = data.product as SellerProduct;
      setProducts((current) => editingId ? current.map((item) => item.id === product.id ? product : item) : [product, ...current]);
      setFormOpen(false); setEditingId(null);
      setMessage(editingId ? "Perfume details saved." : "Perfume added to your catalogue.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save this perfume.");
    } finally { setBusy(false); }
  }

  async function toggleProduct(product: SellerProduct) {
    const payload = {
      id: product.id, name: product.name, slug: product.slug, category: product.category,
      price: product.pricePaise / 100, compareAtPrice: product.compareAtPaise ? product.compareAtPaise / 100 : null,
      size: product.size, concentration: product.concentration, notes: product.notes.join(", "), description: product.description,
      imageUrl: product.imageUrl ?? "", accent: product.accent, stock: product.stock, active: !product.active,
    };
    setErrorMessage(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/seller/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update product visibility.");
      setProducts((current) => current.map((item) => item.id === product.id ? data.product : item));
      setMessage(data.product.active ? "Perfume is now visible in the store." : "Perfume is hidden from the store.");
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Could not update product visibility."); }
    finally { setBusy(false); }
  }

  function draftFor(order: SellerOrder) {
    return drafts[order.id] ?? {
      status: order.fulfillment.status,
      trackingCarrier: order.fulfillment.tracking_carrier ?? "",
      trackingNumber: order.fulfillment.tracking_number ?? "",
      trackingUrl: order.fulfillment.tracking_url ?? "",
    };
  }

  async function saveFulfillment(order: SellerOrder) {
    const draft = draftFor(order);
    setSavingFulfillment(order.id); setErrorMessage(""); setMessage("");
    try {
      const response = await fetch(`/api/seller/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update shipment.");
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, fulfillment: data.fulfillment } : item));
      setMessage(`Order ${order.order_number} updated.`);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Could not update shipment."); }
    finally { setSavingFulfillment(null); }
  }

  const tabs = [
    { id: "products" as const, label: "My perfumes", icon: Package, count: products.length },
    { id: "orders" as const, label: "Orders", icon: ClipboardList, count: orders.length },
    { id: "returns" as const, label: "Returns", icon: Undo2, count: returns.length },
    { id: "earnings" as const, label: "Sales", icon: BadgeIndianRupee },
  ];

  return <main className="seller-page">
    <header className="admin-topbar"><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><div><span>{storeName || "Seller account"}</span><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></header>
    <section className="seller-shell">
      <aside className="seller-sidebar"><span className="seller-sidebar-label">SELLER SPACE</span>{tabs.map(({ id, label, icon: Icon, count }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={15}/>{label}{count !== undefined && <small>{count}</small>}</button>)}<div className="seller-sidebar-brand"><Store size={17}/><span>FLOVEXA MARKETPLACE</span></div></aside>
      <div className="seller-content">
        <div className="seller-heading"><div><span className="eyebrow">FLOVEXA SELLER PORTAL</span><h1>{tab === "products" ? "Your perfumes." : tab === "orders" ? "Your orders." : tab === "returns" ? "Return requests." : "Your sales."}</h1><p>Manage your own catalogue and customer orders.</p></div>{tab === "products" && <button className="admin-primary" onClick={beginAdd}><Plus size={15}/> Add perfume</button>}</div>
        {(message || errorMessage) && <div className={`seller-message ${errorMessage ? "seller-message-error" : ""}`}>{errorMessage || message}</div>}
        <div className="seller-stats"><div><span>CATALOGUE</span><b>{products.length}</b><small>{activeProducts} visible in store</small></div><div><span>OPEN ORDERS</span><b>{orders.filter((order) => order.fulfillment.status !== "delivered").length}</b><small>{orders.length} paid orders assigned</small></div><div><span>GROSS SALES</span><b>{money(grossSales)}</b><small>Captured orders in your store</small></div></div>

        {tab === "products" && <section className="seller-panel"><div className="seller-panel-head"><h2>My product catalogue</h2><span>{products.length} perfumes</span></div>
          {formOpen && <form className="seller-product-form" onSubmit={saveProduct}><div className="seller-form-head"><div><span className="eyebrow">{editingId ? "EDIT PERFUME" : "NEW PERFUME"}</span><h3>{editingId ? "Update product details" : "Add a perfume"}</h3></div><button type="button" onClick={() => setFormOpen(false)}>Close <ChevronRight size={14}/></button></div>
            <div className="seller-fields"><label>Perfume name<input required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))}/></label><label>Product URL<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}/></label><label>Category<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Price (₹)<input required type="number" min="1" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}/></label><label>Regular price (₹)<input type="number" min="1" step="0.01" value={form.compareAtPrice} onChange={(event) => setForm((current) => ({ ...current, compareAtPrice: event.target.value }))}/></label><label>Size<input required maxLength={40} value={form.size} onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))}/></label><label>Concentration<input required maxLength={80} value={form.concentration} onChange={(event) => setForm((current) => ({ ...current, concentration: event.target.value }))}/></label><label>Stock quantity<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}/></label><label>Image link (HTTPS)<input type="url" value={form.imageUrl} placeholder="https://…" onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}/></label><label className="seller-field-wide">Fragrance notes<input required maxLength={240} value={form.notes} placeholder="Bergamot, rose, sandalwood" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}/></label><label className="seller-field-wide">Description<textarea required minLength={10} maxLength={1600} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}/></label><label className="edit-check"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}/> Visible in the storefront</label></div>
            <button className="admin-primary" disabled={busy}><Save size={14}/>{busy ? "Saving…" : editingId ? "Save changes" : "Add perfume"}</button></form>}
          {!products.length ? <div className="admin-empty"><Package size={23}/><b>Your catalogue is empty</b><span>Add your first perfume with its price, stock and scent details.</span><button onClick={beginAdd}><Plus size={14}/> Add perfume</button></div> : <div className="seller-product-list">{products.map((product) => <article className="seller-product" key={product.id}><div className="seller-product-mark" style={{ "--juice": product.accent } as React.CSSProperties}>{product.imageUrl ? <Image src={product.imageUrl} alt="" width={34} height={42} unoptimized/> : "F"}</div><div className="seller-product-info"><b>{product.name}</b><small>{product.category} · {product.size} · {product.stock} in stock</small></div><strong>{money(product.pricePaise)}</strong><span className={product.active ? "seller-live" : "seller-hidden"}>{product.active ? "Visible" : "Hidden"}</span><button onClick={() => beginEdit(product)}>Edit</button><button disabled={busy} onClick={() => void toggleProduct(product)}>{product.active ? "Hide" : "Publish"}</button></article>)}</div>}
        </section>}

        {tab === "orders" && <section className="seller-panel"><div className="seller-panel-head"><h2>Paid orders for your perfumes</h2><span>{orders.length} orders</span></div>{!ordersLoaded ? <div className="seller-loading">Loading your orders…</div> : ordersError ? <div className="seller-loading seller-error-text">{ordersError}</div> : !orders.length ? <div className="admin-empty"><ClipboardList size={23}/><b>No paid orders yet</b><span>Orders containing your perfumes will appear here after payment is confirmed.</span></div> : <div className="seller-order-list">{orders.map((order) => { const draft = draftFor(order); const next = transitions[order.fulfillment.status] ?? []; return <article className="seller-order" key={order.id}><div className="seller-order-head"><div><b>{order.order_number}</b><small>{new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></div><span className={`seller-status seller-status-${draft.status}`}>{draft.status.replaceAll("_", " ")}</span></div><div className="seller-order-customer"><b>{order.customer_name}</b><a href={`tel:${order.phone}`}>{order.phone}</a></div><div className="seller-order-lines">{order.order_items.map((item, index) => <div key={`${order.id}-${index}`}><span>{item.product_name} · {item.size} × {item.quantity}</span><b>{money(item.line_total_paise)}</b></div>)}</div><p className="seller-order-address">{order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""}, {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}</p>{next.length > 0 && <div className="seller-fulfillment"><label>Next step<select value={draft.status} onChange={(event) => setDrafts((current) => ({ ...current, [order.id]: { ...draft, status: event.target.value } }))}><option value={order.fulfillment.status}>{order.fulfillment.status.replaceAll("_", " ")}</option>{next.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label><label>Courier<input value={draft.trackingCarrier} onChange={(event) => setDrafts((current) => ({ ...current, [order.id]: { ...draft, trackingCarrier: event.target.value } }))} placeholder="Courier partner"/></label><label>Tracking number<input value={draft.trackingNumber} onChange={(event) => setDrafts((current) => ({ ...current, [order.id]: { ...draft, trackingNumber: event.target.value } }))} placeholder="Shipment reference"/></label><label>Tracking link<input type="url" value={draft.trackingUrl} onChange={(event) => setDrafts((current) => ({ ...current, [order.id]: { ...draft, trackingUrl: event.target.value } }))} placeholder="https://…"/></label><button onClick={() => void saveFulfillment(order)} disabled={savingFulfillment === order.id}><Check size={13}/>{savingFulfillment === order.id ? "Saving…" : "Save update"}</button></div>}</article>; })}</div>}</section>}

        {tab === "returns" && <section className="seller-panel"><div className="seller-panel-head"><h2>Customer return requests</h2><span>{returns.length} requests</span></div>{!ordersLoaded ? <div className="seller-loading">Loading return requests…</div> : ordersError ? <div className="seller-loading seller-error-text">{ordersError}</div> : !returns.length ? <div className="admin-empty"><Undo2 size={23}/><b>No return requests</b><span>Requests linked to your perfume orders will be listed here.</span></div> : <div className="seller-order-list">{returns.map((request) => <article className="seller-order" key={request.id}><div className="seller-order-head"><div><b>{request.order_number}</b><small>{request.customer_name} · {new Date(request.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</small></div><span className="seller-status">{request.status.replaceAll("_", " ")}</span></div><b className="seller-return-reason">{request.reason.replaceAll("_", " ")}</b><p className="seller-order-address">{request.details || "No extra details supplied."}</p><small className="seller-owner-note">Contact the store owner to coordinate this return. Refund decisions remain with Flovexa owner.</small></article>)}</div>}</section>}

        {tab === "earnings" && <section className="seller-panel seller-earnings"><div className="seller-panel-head"><h2>Sales and earnings</h2><span>Captured orders only</span></div><div className="seller-earning-total"><BadgeIndianRupee size={19}/><div><span>GROSS PRODUCT SALES</span><b>{money(grossSales)}</b></div></div><p>This total is calculated from your products in captured customer orders. It does not include the store&apos;s shipping or tax charges, and it is not a payout balance.</p><div className="seller-settlement-note"><b>Settlements will be enabled with payments.</b><span>Bank details, commission deductions, refund adjustments and payout tracking will be added when Flovexa&apos;s payment and settlement system is connected.</span></div></section>}
      </div>
    </section>
  </main>;
}
