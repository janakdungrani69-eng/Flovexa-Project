"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Box, Check, ChevronRight, CircleDollarSign, Package, Plus, Save, Search, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/products";

export type AdminProduct = Product & { stock: number; createdAt: string };
export type AdminOrder = {
  id: string; order_number: string; customer_name: string; email: string; phone: string;
  shipping_address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  total_paise: number; status: string; payment_status: string; tracking_carrier: string | null;
  tracking_number: string | null; tracking_url: string | null; created_at: string;
  order_items: { product_name: string; size: string; quantity: number }[];
};
const categories = ["For Her", "For Him", "Unisex", "Oud & Attar", "Discovery Sets"];
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const blank = { name: "", slug: "", category: "Unisex", price: "", size: "50 ml", concentration: "Eau de Parfum", notes: "", description: "", imageUrl: "", accent: "#ad7045", stock: "0", featured: false, active: false };

export default function AdminDashboard({ products: initialProducts, orders: initialOrders }: { products: AdminProduct[]; orders: AdminOrder[] }) {
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [shipments, setShipments] = useState<Record<string, { trackingCarrier: string; trackingNumber: string; trackingUrl: string }>>({});
  const filteredProducts = useMemo(() => products.filter((item) => `${item.name} ${item.slug} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const filteredOrders = useMemo(() => orders.filter((order) => orderFilter === "all" || order.status === orderFilter), [orders, orderFilter]);
  function openProduct(product?: AdminProduct) {
    setFormOpen(true);
    setSelected(product ?? null);
    setForm(product ? { name: product.name, slug: product.slug, category: product.category, price: (product.pricePaise / 100).toFixed(2), size: product.size, concentration: product.concentration, notes: product.notes.join(", "), description: product.description, imageUrl: product.imageUrl ?? "", accent: product.accent, stock: String(product.stock), featured: product.featured, active: product.active } : blank);
    setMessage("");
  }
  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/products", { method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: selected?.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save product.");
      if (selected) setProducts((current) => current.map((item) => item.id === result.product.id ? result.product : item));
      else setProducts((current) => [result.product, ...current]);
      setMessage("Product saved."); setSelected(null); setFormOpen(false); setForm(blank);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save product."); }
    finally { setBusy(false); }
  }
  async function toggleProduct(product: AdminProduct) {
    const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id, name: product.name, slug: product.slug, category: product.category, price: product.pricePaise / 100, size: product.size, concentration: product.concentration, notes: product.notes.join(", "), description: product.description, imageUrl: product.imageUrl ?? "", accent: product.accent, stock: product.stock, featured: product.featured, active: !product.active }) });
    const result = await response.json();
    if (response.ok) setProducts((current) => current.map((item) => item.id === product.id ? result.product : item));
    else setMessage(result.error ?? "Could not update product.");
  }
  async function updateOrder(order: AdminOrder, status = order.status) {
    const values = shipments[order.id] ?? { trackingCarrier: order.tracking_carrier ?? "", trackingNumber: order.tracking_number ?? "", trackingUrl: order.tracking_url ?? "" };
    const response = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ...values }) });
    const result = await response.json();
    if (response.ok) setOrders((current) => current.map((item) => item.id === order.id ? result.order : item));
    else setMessage(result.error ?? "Could not update order.");
  }
  const paidTotal = orders.filter((order) => order.payment_status === "captured").reduce((sum, order) => sum + order.total_paise, 0);

  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-sidebar-label">YOUR STORE</div><button className={tab === "orders" ? "active" : ""} onClick={() => { setTab("orders"); setMessage(""); }}><ShoppingBag size={16}/> Orders <span>{orders.filter((order) => order.status === "paid").length}</span></button><button className={tab === "products" ? "active" : ""} onClick={() => { setTab("products"); setMessage(""); }}><Box size={16}/> Products <span>{products.length}</span></button><div className="admin-sidebar-bottom"><span>FLOVEXA PERFUMES</span><small>STORE ADMINISTRATION</small></div></aside>
    <section className="admin-content"><div className="admin-content-head"><div><span className="eyebrow">STORE MANAGEMENT · INDIA</span><h1>{tab === "orders" ? "Orders" : "Your fragrances"}</h1><p>{tab === "orders" ? "Keep every order moving, from payment to delivery." : "Manage the collection customers see in your storefront."}</p></div>{tab === "products" && <button className="admin-primary" onClick={() => openProduct()}><Plus size={16}/> Add a fragrance</button>}</div>
      {message && <div className="admin-message" role="status"><Check size={16}/>{message}</div>}
      <div className="admin-stats"><div><span><ShoppingBag size={15}/> ORDERS</span><b>{orders.length}</b><small>Latest 50 orders</small></div><div><span><CircleDollarSign size={15}/> PAID VALUE</span><b>{money(paidTotal)}</b><small>Captured payments</small></div><div><span><Package size={15}/> ACTIVE SCENTS</span><b>{products.filter((item) => item.active).length}</b><small>{products.reduce((sum, item) => sum + item.stock, 0)} units in stock</small></div></div>
      {tab === "orders" ? <div className="admin-panel"><div className="admin-panel-tools"><h2>Recent orders</h2><label className="admin-filter"><Search size={15}/><select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}><option value="all">All order statuses</option><option value="pending_payment">Payment pending</option><option value="paid">Paid</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select></label></div>
        {!filteredOrders.length ? <div className="admin-empty"><ShoppingBag size={24}/><b>No orders yet</b><span>New orders will appear here after a customer completes payment.</span></div> : <div className="orders-list">{filteredOrders.map((order) => <article className="order-card" key={order.id}><div className="order-card-head"><div><span>{order.order_number}</span><small>{new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></div><div className={`order-status status-${order.status}`}>{order.status.replaceAll("_", " ")}</div></div><div className="order-card-customer"><div><b>{order.customer_name}</b><span>{order.email} · {order.phone}</span></div><strong>{money(order.total_paise)}</strong></div><div className="order-card-items">{order.order_items.map((item, index) => <span key={`${order.id}-${index}`}>{item.product_name} · {item.size} × {item.quantity}</span>)}</div><div className="order-delivery"><span>{order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""}, {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}</span><span className={`payment-pill payment-${order.payment_status}`}>{order.payment_status.replaceAll("_", " ")}</span></div>{order.status !== "cancelled" && order.status !== "refunded" && <div className="order-actions"><label>Status<select value={order.status} onChange={(event) => updateOrder(order, event.target.value)}><option value="paid">Paid</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select></label><label>Carrier<input value={shipments[order.id]?.trackingCarrier ?? order.tracking_carrier ?? ""} onChange={(event) => setShipments((all) => ({ ...all, [order.id]: { ...all[order.id], trackingCarrier: event.target.value, trackingNumber: all[order.id]?.trackingNumber ?? order.tracking_number ?? "", trackingUrl: all[order.id]?.trackingUrl ?? order.tracking_url ?? "" } }))} placeholder="Courier partner" /></label><label>Tracking number<input value={shipments[order.id]?.trackingNumber ?? order.tracking_number ?? ""} onChange={(event) => setShipments((all) => ({ ...all, [order.id]: { ...all[order.id], trackingNumber: event.target.value, trackingCarrier: all[order.id]?.trackingCarrier ?? order.tracking_carrier ?? "", trackingUrl: all[order.id]?.trackingUrl ?? order.tracking_url ?? "" } }))} placeholder="Shipment reference" /></label><label>Tracking link<input value={shipments[order.id]?.trackingUrl ?? order.tracking_url ?? ""} onChange={(event) => setShipments((all) => ({ ...all, [order.id]: { ...all[order.id], trackingUrl: event.target.value, trackingCarrier: all[order.id]?.trackingCarrier ?? order.tracking_carrier ?? "", trackingNumber: all[order.id]?.trackingNumber ?? order.tracking_number ?? "" } }))} placeholder="https://…" /></label><button onClick={() => updateOrder(order)}><Save size={14}/> Save fulfillment</button></div>}</article>)}</div>}
      </div> : <div className="admin-panel"><div className="admin-panel-tools"><h2>Product catalogue</h2><label className="admin-filter"><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fragrances" /></label></div>
        {formOpen && <form className="product-edit-form" onSubmit={saveProduct}><div className="edit-form-heading"><div><span className="eyebrow">{selected ? "EDIT CATALOGUE" : "NEW CATALOGUE ITEM"}</span><h3>{selected ? selected.name : "Add a fragrance"}</h3></div><button type="button" onClick={() => { setFormOpen(false); setSelected(null); }}>Close <ChevronRight size={15}/></button></div><div className="edit-fields"><label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })}/></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Price (₹)<input required type="number" min="1" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })}/></label><label>Size<input required value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })}/></label><label>Concentration<input required value={form.concentration} onChange={(event) => setForm({ ...form, concentration: event.target.value })}/></label><label>Stock quantity<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })}/></label><label>Image URL<input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="Supabase Storage image URL"/></label><label className="edit-wide">Fragrance notes<input required value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Bergamot, rose, sandalwood"/></label><label className="edit-wide">Description<textarea required rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label><label className="edit-check"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })}/> Featured on homepage</label><label className="edit-check"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })}/> Visible in storefront</label></div><button className="admin-primary" disabled={busy}><Save size={15}/>{busy ? "Saving…" : "Save fragrance"}</button></form>}
        {!filteredProducts.length ? <div className="admin-empty"><Package size={24}/><b>No products yet</b><span>Add the real product catalogue and images to start building your storefront.</span><button onClick={() => openProduct()}><Plus size={15}/> Add first fragrance</button></div> : <div className="product-admin-list">{filteredProducts.map((product) => <article className="product-admin-row" key={product.id}><div className="admin-product-swatch" style={{ "--juice": product.accent } as React.CSSProperties}>F</div><div className="admin-product-title"><b>{product.name}</b><small>{product.category} · {product.size} · {product.stock} in stock</small></div><strong>{money(product.pricePaise)}</strong><span className={product.active ? "product-active" : "product-inactive"}>{product.active ? "Visible" : "Hidden"}</span><button onClick={() => openProduct(product)}>Edit</button><button onClick={() => toggleProduct(product)}>{product.active ? "Hide" : "Publish"}</button></article>)}</div>}
      </div>}
    </section>
  </div>;
}
