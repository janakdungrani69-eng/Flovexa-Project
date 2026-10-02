"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Heart, MapPin, Package, UserRound } from "lucide-react";

type Tab = "orders" | "wishlist" | "addresses" | "profile";
type SellerShipment = { status: string; tracking_carrier: string | null; tracking_number: string | null; tracking_url: string | null; seller_profiles: { store_name: string } | null };
type Order = { id: string; order_number: string; status: string; payment_status: string; total_paise: number; created_at: string; tracking_carrier: string | null; tracking_number: string | null; tracking_url: string | null; seller_fulfillments: SellerShipment[]; order_items: Array<{ product_name: string; size: string; quantity: number }> };
type Address = { id: string; label: string; full_name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string; is_default: boolean };
type WishlistProduct = { id: string; product_id: string; slug: string; name: string; category: string; price_paise: number; size: string; image_url: string | null; accent: string };
type ReturnRequest = { id: string; order_id: string; reason: string; details: string; status: string; created_at: string };
type AccountData = { email: string; profile: { full_name: string; phone: string }; addresses: Address[]; wishlist: WishlistProduct[]; orders: Order[]; returns: ReturnRequest[] };

const emptyAddress = { id: "", label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", is_default: true };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default function CustomerAccount({ email }: { email: string }) {
  const [data, setData] = useState<AccountData | null>(null);
  const [tab, setTab] = useState<Tab>("orders");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", phone: "" });
  const [address, setAddress] = useState(emptyAddress);
  const [editingAddress, setEditingAddress] = useState(false);
  const [returningOrder, setReturningOrder] = useState("");
  const [returnReason, setReturnReason] = useState("damaged");
  const [returnDetails, setReturnDetails] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const pendingProduct = sessionStorage.getItem("flovexa-pending-wishlist");
      if (pendingProduct) {
        const saved = await fetch("/api/account/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: pendingProduct }) });
        if (saved.ok || saved.status === 404) sessionStorage.removeItem("flovexa-pending-wishlist");
      }
      const response = await fetch("/api/account", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load your account.");
      if (!active) return;
      setData(result);
      setProfile({ fullName: result.profile.full_name, phone: result.profile.phone });
    })().catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Could not load your account."); });
    return () => { active = false; };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save your profile.");
      setData((current) => current ? { ...current, profile: result.profile } : current); setNotice("Your profile has been saved.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save your profile."); }
    finally { setBusy(false); }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/account/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(address) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save this address.");
      setData((current) => current ? { ...current, addresses: [result.address, ...current.addresses.filter((item) => item.id !== result.address.id).map((item) => result.address.is_default ? { ...item, is_default: false } : item)] } : current);
      setAddress(emptyAddress); setEditingAddress(false); setNotice("Delivery address saved.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save this address."); }
    finally { setBusy(false); }
  }

  async function deleteAddress(id: string) {
    setError(""); setNotice("");
    const response = await fetch(`/api/account/addresses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not remove this address."); return; }
    const refreshed = await fetch("/api/account", { cache: "no-store" }).then((res) => res.json());
    setData((current) => current ? { ...current, addresses: refreshed.addresses } : current); setNotice("Delivery address removed.");
  }

  async function removeWishlist(productId: string) {
    const response = await fetch("/api/account/wishlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not update your saved perfumes."); return; }
    setData((current) => current ? { ...current, wishlist: current.wishlist.filter((item) => item.product_id !== productId) } : current);
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/account/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: returningOrder, reason: returnReason, details: returnDetails }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit your request.");
      setData((current) => current ? { ...current, returns: [result.returnRequest, ...current.returns] } : current);
      setReturningOrder(""); setReturnDetails(""); setNotice("Your return request was sent to the store for review.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not submit your request."); }
    finally { setBusy(false); }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Package }> = [
    { id: "orders", label: "My orders", icon: Package }, { id: "wishlist", label: "Saved perfumes", icon: Heart }, { id: "addresses", label: "Addresses", icon: MapPin }, { id: "profile", label: "My profile", icon: UserRound },
  ];

  return <section className="customer-account"><span className="eyebrow">YOUR FLOVEXA ACCOUNT</span><h1>Welcome back.</h1><p>{email} · Manage your orders, saved perfumes and delivery details.</p>
    <nav className="account-tabs" aria-label="Customer account">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "selected" : ""} onClick={() => { setTab(id); setError(""); setNotice(""); }}><Icon size={14}/>{label}{id === "orders" && data ? <small>{data.orders.length}</small> : null}</button>)}</nav>
    {error && <div className="account-feedback account-error" role="alert">{error}</div>}{notice && <div className="account-feedback" role="status">{notice}</div>}
    {!data ? <div className="admin-panel account-loading">{error ? "Account details could not be loaded." : "Loading your account…"}</div> : <>
      {tab === "orders" && <section className="admin-panel account-orders"><div className="admin-panel-tools"><h2>My orders</h2><Link href="/orders">Track an order</Link></div>
        {!data.orders.length ? <div className="admin-empty"><b>No orders yet</b><span>Once you place an order with this email address, it will appear here.</span><Link className="primary-button" href="/#collection">Explore perfumes</Link></div> : <div className="orders-list">{data.orders.map((order) => {
          const returnRequest = data.returns.find((item) => item.order_id === order.id);
          const canRequestReturn = order.payment_status === "captured" && !["cancelled", "refunded", "pending_payment", "payment_review"].includes(order.status);
          return <article className="order-card" key={order.order_number}><div className="order-card-head"><div><span>{order.order_number}</span><small>{new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</small></div><span className={`order-status status-${order.status}`}>{order.status.replaceAll("_", " ")}</span></div><div className="order-card-items">{order.order_items.map((item, index) => <span key={`${order.order_number}-${index}`}>{item.product_name} · {item.size} × {item.quantity}</span>)}</div><div className="account-order-bottom"><span className={`payment-pill payment-${order.payment_status}`}>{order.payment_status.replaceAll("_", " ")}</span><strong>{money(order.total_paise)}</strong>{order.seller_fulfillments.length ? order.seller_fulfillments.map((shipment, index) => <span className="account-seller-shipment" key={index}>{shipment.seller_profiles?.store_name || "Seller shipment"} · {shipment.status.replaceAll("_", " ")}{shipment.tracking_url && <a href={shipment.tracking_url} target="_blank" rel="noreferrer">Track <ArrowRight size={13}/></a>}</span>) : order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer">Track shipment <ArrowRight size={13}/></a>}{canRequestReturn && !returnRequest && <button onClick={() => { setReturningOrder(order.id); setReturnDetails(""); }}>Request a return</button>}{returnRequest && <span className="return-status">Return: {returnRequest.status.replaceAll("_", " ")}</span>}</div>
            {returningOrder === order.id && <form className="return-request-form" onSubmit={submitReturn}><label>Why are you contacting us?<select value={returnReason} onChange={(event) => setReturnReason(event.target.value)}><option value="damaged">Item arrived damaged</option><option value="wrong_item">I received the wrong item</option><option value="quality">Product quality concern</option><option value="other">Other</option></select></label><label>Details<textarea maxLength={1000} rows={3} value={returnDetails} onChange={(event) => setReturnDetails(event.target.value)} placeholder="Add helpful details for the store team."/></label><div><button type="submit" disabled={busy}>{busy ? "Sending…" : "Send return request"}</button><button type="button" onClick={() => setReturningOrder("")}>Cancel</button></div><small>The store team will review your request and contact you about next steps. Refunds are not issued automatically.</small></form>}
          </article>;
        })}</div>}
      </section>}
      {tab === "wishlist" && <section className="admin-panel account-orders"><div className="admin-panel-tools"><h2>Saved perfumes</h2><Link href="/#collection">Discover more <ArrowRight size={13}/></Link></div>{!data.wishlist.length ? <div className="admin-empty"><Heart size={22}/><b>Your saved perfumes will appear here</b><span>Save a scent from the collection to keep it close.</span><Link className="primary-button" href="/#collection">Explore perfumes</Link></div> : <div className="wishlist-grid">{data.wishlist.map((item) => <article className="wishlist-card" key={item.product_id}><Link href={`/products/${item.slug}`}><div className="wishlist-art" style={{ "--juice": item.accent } as React.CSSProperties}>{item.image_url ? <Image src={item.image_url} alt={item.name} width={240} height={240} unoptimized/> : <span>F.</span>}</div><small>{item.category} · {item.size}</small><b>{item.name}</b><strong>{money(item.price_paise)}</strong></Link><button onClick={() => removeWishlist(item.product_id)}>Remove</button></article>)}</div>}</section>}
      {tab === "addresses" && <section className="admin-panel account-orders"><div className="admin-panel-tools"><h2>Delivery addresses</h2>{!editingAddress && <button onClick={() => { setAddress({ ...emptyAddress, full_name: data.profile.full_name, phone: data.profile.phone, is_default: data.addresses.length === 0 }); setEditingAddress(true); }}>Add an address</button>}</div>
        {editingAddress && <form className="customer-data-form" onSubmit={saveAddress}><div className="edit-fields"><label>Address label<input required maxLength={40} value={address.label} onChange={(event) => setAddress({ ...address, label: event.target.value })} placeholder="Home, work…"/></label><label>Full name<input required maxLength={100} autoComplete="name" value={address.full_name} onChange={(event) => setAddress({ ...address, full_name: event.target.value })}/></label><label>Mobile number<input required type="tel" maxLength={20} value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })}/></label><label className="edit-wide">Address line 1<input required maxLength={150} autoComplete="address-line1" value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })}/></label><label className="edit-wide">Apartment, suite or landmark<input maxLength={150} autoComplete="address-line2" value={address.line2} onChange={(event) => setAddress({ ...address, line2: event.target.value })}/></label><label>City<input required maxLength={80} autoComplete="address-level2" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })}/></label><label>State<input required maxLength={80} autoComplete="address-level1" value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })}/></label><label>PIN code<input required pattern="\d{6}" maxLength={6} inputMode="numeric" autoComplete="postal-code" value={address.pincode} onChange={(event) => setAddress({ ...address, pincode: event.target.value })}/></label></div><label className="edit-check"><input type="checkbox" checked={address.is_default} onChange={(event) => setAddress({ ...address, is_default: event.target.checked })}/> Set as default delivery address</label><div className="customer-form-actions"><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Save address"}</button><button type="button" onClick={() => { setEditingAddress(false); setAddress(emptyAddress); }}>Cancel</button></div></form>}
        {!data.addresses.length && !editingAddress ? <div className="admin-empty"><MapPin size={22}/><b>No saved addresses</b><span>Save a delivery address to make future checkouts quicker.</span><button onClick={() => { setAddress({ ...emptyAddress, full_name: data.profile.full_name, phone: data.profile.phone, is_default: true }); setEditingAddress(true); }}>Add a delivery address</button></div> : <div className="saved-address-list">{data.addresses.map((item) => <article className="saved-address-card" key={item.id}><div><b>{item.label}</b>{item.is_default && <small>DEFAULT</small>}</div><strong>{item.full_name}</strong><span>{item.phone}</span><p>{item.line1}{item.line2 ? `, ${item.line2}` : ""}<br/>{item.city}, {item.state} {item.pincode}</p><div><button onClick={() => { setAddress(item); setEditingAddress(true); }}>Edit</button><button onClick={() => void deleteAddress(item.id)}>Remove</button></div></article>)}</div>}
      </section>}
      {tab === "profile" && <section className="admin-panel account-orders"><div className="admin-panel-tools"><h2>Personal details</h2></div><form className="customer-data-form" onSubmit={saveProfile}><p>Your email address is used to match orders to your account: <b>{data.email}</b></p><div className="edit-fields"><label>Full name<input required minLength={2} maxLength={100} autoComplete="name" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}/></label><label>Mobile number<input required type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })}/></label></div><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button></form></section>}
    </>}
  </section>;
}
