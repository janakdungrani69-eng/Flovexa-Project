"use client";

import { useState, type FormEvent } from "react";
import { BadgePercent, Plus } from "lucide-react";

export type AdminCoupon = { id: string; code: string; discount_type: "percentage" | "fixed_amount"; discount_value: number; minimum_order_paise: number; maximum_discount_paise: number | null; starts_at: string; expires_at: string | null; usage_limit: number | null; usage_count: number; active: boolean };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const blank = { code: "", discountType: "percentage", discountValue: "10", minimumOrder: "0", maximumDiscount: "", startsAt: "", expiresAt: "", usageLimit: "" };

export default function AdminCoupons({ initialCoupons }: { initialCoupons: AdminCoupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        ...form, code: form.code.trim().toUpperCase(), discountValue: Number(form.discountValue), minimumOrder: Number(form.minimumOrder),
        maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : null, startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null, usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create the coupon.");
      setCoupons((current) => [result.coupon, ...current]); setForm(blank); setMessage("Coupon saved. Checkout redemption will be enabled in the payment phase.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create the coupon."); }
    finally { setBusy(false); }
  }
  async function toggle(coupon: AdminCoupon) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !coupon.active }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update coupon.");
      setCoupons((current) => current.map((item) => item.id === coupon.id ? { ...item, active: result.coupon.active } : item));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update coupon."); }
    finally { setBusy(false); }
  }
  return <div className="admin-coupon-layout"><section className="admin-panel"><div className="admin-panel-tools"><h2>Create a discount code</h2></div>{message && <p className="admin-inline-message" role="status">{message}</p>}<form className="admin-coupon-form" onSubmit={createCoupon}><label>Coupon code<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]{3,32}" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="WELCOME10"/></label><label>Discount type<select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })}><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount (₹)</option></select></label><label>{form.discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}<input required type="number" min="1" max={form.discountType === "percentage" ? 90 : 1000000} step="1" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })}/></label><label>Minimum order (₹)<input required type="number" min="0" step="1" value={form.minimumOrder} onChange={(event) => setForm({ ...form, minimumOrder: event.target.value })}/></label>{form.discountType === "percentage" && <label>Maximum discount (₹)<input type="number" min="1" step="1" value={form.maximumDiscount} onChange={(event) => setForm({ ...form, maximumDiscount: event.target.value })} placeholder="Optional cap"/></label>}<label>Starts at<input type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })}/></label><label>Expires at <small>Optional</small><input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}/></label><label>Usage limit <small>Optional</small><input type="number" min="1" step="1" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}/></label><button className="admin-primary" disabled={busy}><Plus size={15}/>{busy ? "Saving…" : "Save coupon"}</button></form></section><section className="admin-panel"><div className="admin-panel-tools"><h2>Saved coupons</h2><span>{coupons.length} codes</span></div>{!coupons.length ? <div className="admin-empty"><BadgePercent size={24}/><b>No discount codes</b><span>Create a code to prepare a future promotion.</span></div> : <div className="admin-coupon-list">{coupons.map((coupon) => <article className="admin-coupon-card" key={coupon.id}><div><b>{coupon.code}</b><span>{coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `${money(coupon.discount_value)} off`}</span></div><p>Minimum order {money(coupon.minimum_order_paise)}{coupon.maximum_discount_paise ? ` · Cap ${money(coupon.maximum_discount_paise)}` : ""}</p><small>{coupon.usage_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""} redemptions · {new Date(coupon.starts_at).toLocaleDateString("en-IN")}{coupon.expires_at ? ` – ${new Date(coupon.expires_at).toLocaleDateString("en-IN")}` : " · no expiry"}</small><button disabled={busy} className={coupon.active ? "coupon-active" : ""} onClick={() => void toggle(coupon)}>{coupon.active ? "Active · pause" : "Paused · activate"}</button></article>)}</div>}<p className="admin-report-scope">Codes are stored and managed here. Customers cannot redeem them until online checkout is connected in the final payment phase.</p></section></div>;
}
