"use client";

import Script from "next/script";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

type CartLine = { productId: string; quantity: number };
type PaymentResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: PaymentResponse) => void;
  modal: { ondismiss: () => void };
};
declare global { interface Window { Razorpay?: new (options: CheckoutOptions) => { open: () => void; on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void } } }

type CustomerPrefill = { name: string; email: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string };
const blankValues = { name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

export default function CheckoutForm({ items, enabled, initialCustomer }: { items: CartLine[]; enabled: boolean; initialCustomer?: CustomerPrefill }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [values, setValues] = useState(initialCustomer ?? blankValues);
  function change(event: React.ChangeEvent<HTMLInputElement>) { setValues((current) => ({ ...current, [event.target.name]: event.target.value })); }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setSuccess("");
    if (!items.length) { setMessage("Your bag is empty. Add a fragrance before checkout."); return; }
    if (!enabled) { setMessage("Secure checkout is being configured. This sample catalogue is not accepting real orders yet."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        items: items.map(({ productId, quantity }) => ({ id: productId, quantity })),
        customer: { name: values.name, email: values.email, phone: values.phone, address: { line1: values.line1, line2: values.line2, city: values.city, state: values.state, pincode: values.pincode, country: "India" } },
      }) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error ?? "We could not start checkout.");
      if (!window.Razorpay) throw new Error("Secure payment is unavailable in this browser. Please refresh and try again.");
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amountPaise, currency: order.currency, name: "FLOVEXA PERFUMES",
        description: `Order ${order.orderNumber}`, order_id: order.razorpayOrderId,
        prefill: { name: values.name, email: values.email, contact: values.phone }, theme: { color: "#342b20" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment) => {
          try {
            const verification = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ localOrderId: order.localOrderId, ...payment }) });
            const result = await verification.json();
            if (!verification.ok) throw new Error(result.error ?? "Payment confirmation is pending.");
            localStorage.removeItem("flovexa-cart");
            setSuccess(result.orderStatus === "payment_review" ? `Payment for ${result.orderNumber} reached us. Our team is confirming availability and will update you shortly.` : result.paymentStatus === "captured" ? `Thank you. Your order ${result.orderNumber} is confirmed.` : `Payment for ${result.orderNumber} is authorized and awaiting confirmation.`);
            setValues(blankValues);
          } catch (error) { setMessage(error instanceof Error ? error.message : "We could not confirm payment yet."); }
          finally { setBusy(false); }
        },
      });
      checkout.on("payment.failed", (failure) => { setBusy(false); setMessage(failure.error?.description ?? "Payment did not complete. Your bag is still saved."); });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout is temporarily unavailable.");
      setBusy(false);
    }
  }

  return <>
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
    {!enabled && <div className="checkout-setup-note"><LockKeyhole size={17} /><div><b>Secure checkout is not live yet</b><p>Real catalogue, shipping and tax settings, and merchant payment accounts must be connected before orders can be accepted.</p></div></div>}
    {success ? <div className="checkout-success"><span>✓</span><h2>Order received</h2><p>{success}</p><Link href="/">Back to the collection <ArrowRight size={15} /></Link></div> : <form className="address-form" onSubmit={pay}>
      <div className="form-section-title"><span>01</span><h2>Contact</h2></div>
      <div className="form-fields"><label className="field-wide">Full name<input autoComplete="name" name="name" required minLength={2} maxLength={100} value={values.name} onChange={change} placeholder="Name for delivery" /></label><label>Email address<input type="email" autoComplete="email" name="email" required value={values.email} onChange={change} placeholder="you@example.com" /></label><label>Mobile number<input type="tel" autoComplete="tel" name="phone" required pattern="[+\d][\d\s()\-]{7,18}" value={values.phone} onChange={change} placeholder="+91 98765 43210" /></label></div>
      <div className="form-section-title"><span>02</span><h2>Delivery address</h2></div>
      <div className="form-fields"><label className="field-wide">Address<input autoComplete="address-line1" name="line1" required minLength={4} maxLength={150} value={values.line1} onChange={change} placeholder="House number and street" /></label><label className="field-wide">Apartment, suite, etc. <small>Optional</small><input autoComplete="address-line2" name="line2" maxLength={150} value={values.line2} onChange={change} placeholder="Apartment, floor, landmark" /></label><label>City<input autoComplete="address-level2" name="city" required value={values.city} onChange={change} /></label><label>State<input autoComplete="address-level1" name="state" required value={values.state} onChange={change} /></label><label>PIN code<input autoComplete="postal-code" name="pincode" required pattern="\d{6}" inputMode="numeric" value={values.pincode} onChange={change} placeholder="6-digit PIN" /></label></div>
      {message && <p className="checkout-message" role="alert">{message}</p>}
      <button className="primary-button pay-button" type="submit" disabled={busy || !items.length || !enabled}>{busy ? "Preparing secure checkout…" : "Continue to secure payment"}<ArrowRight size={16} /></button>
      <p className="payment-assurance"><LockKeyhole size={13} /> Card and UPI payments are handled securely by Razorpay. We never store card details.</p>
    </form>}
  </>;
}
