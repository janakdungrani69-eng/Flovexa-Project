"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, PackageCheck, Truck } from "lucide-react";
import { money } from "@/lib/money";

type Result = { orderNumber: string; status: string; paymentStatus: string; totalPaise: number; createdAt: string; trackingCarrier: string | null; trackingNumber: string | null; trackingUrl: string | null; items: { product_name: string; size: string; quantity: number }[] };

export default function OrderLookup() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setResult(null); setLoading(true);
    try {
      const response = await fetch("/api/orders/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not find your order.");
      setResult(data.order);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Order lookup failed."); }
    finally { setLoading(false); }
  }
  return <div className="order-lookup"><form onSubmit={submit}><label>Order number<input required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value.toUpperCase())} placeholder="FLX-260926-12AB34CD56EF" /></label><label>Checkout email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>{error && <p className="checkout-message" role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "Looking up order…" : "Find my order"}<ArrowRight size={16}/></button></form>
    {result && <section className="order-lookup-result"><div className="order-result-head"><div><span className="eyebrow">ORDER {result.orderNumber}</span><h2>{result.status.replaceAll("_", " ")}</h2></div><PackageCheck size={25}/></div><div className="order-result-items">{result.items.map((item,index)=><div key={`${item.product_name}-${index}`}><span>{item.product_name} · {item.size} × {item.quantity}</span></div>)}</div><div className="order-result-total"><span>Order total</span><b>{money(result.totalPaise)}</b></div>{result.trackingUrl && <a className="tracking-link" href={result.trackingUrl} target="_blank" rel="noreferrer"><Truck size={15}/>{result.trackingCarrier || "Track shipment"} · {result.trackingNumber}<ArrowRight size={15}/></a>}<p className="order-result-date">Placed {new Date(result.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}</p></section>}
  </div>;
}
