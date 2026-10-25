"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, ExternalLink, LockKeyhole, Printer, Sparkles, Truck } from "lucide-react";
import ShippingLabelModal, { type ShippingLabelOrder } from "@/components/shipping-label-modal";

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

export default function CheckoutForm({ items, enabled, initialCustomer, couponCode }: { items: CartLine[]; enabled: boolean; initialCustomer?: CustomerPrefill; couponCode?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState<ShippingLabelOrder | null>(null);
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [values, setValues] = useState<CustomerPrefill>(initialCustomer ?? blankValues);
  const [savedAddressNotice, setSavedAddressNotice] = useState(false);

  // Auto-restore previously saved address from localStorage if server prefill was empty
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem("flovexa-saved-address");
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && typeof saved === "object") {
          setValues((prev) => {
            const merged = {
              name: prev.name || saved.name || "",
              email: prev.email || saved.email || "",
              phone: prev.phone || saved.phone || "",
              line1: prev.line1 || saved.line1 || "",
              line2: prev.line2 || saved.line2 || "",
              city: prev.city || saved.city || "",
              state: prev.state || saved.state || "",
              pincode: prev.pincode || saved.pincode || "",
            };
            if (merged.line1 && merged.city && merged.pincode) {
              setSavedAddressNotice(true);
            }
            return merged;
          });
        }
      } else if (initialCustomer && initialCustomer.line1 && initialCustomer.city) {
        setSavedAddressNotice(true);
        try {
          localStorage.setItem("flovexa-saved-address", JSON.stringify(initialCustomer));
        } catch {}
      }
    } catch (e) {
      console.warn("Storage address read error", e);
    }
  }, [initialCustomer]);

  function change(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((current) => {
      const updated = { ...current, [name]: value };
      try {
        localStorage.setItem("flovexa-saved-address", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setSuccess("");
    const checkoutItems = items.length ? items : [{ productId: "a6e76482-88a3-4035-8c53-26add1348ccc", quantity: 1 }];
    setBusy(true);

    // Save address immediately to localStorage so customer never has to re-enter it
    try {
      localStorage.setItem("flovexa-saved-address", JSON.stringify(values));
    } catch {}

    // In background, also sync this address to customer account addresses if logged in
    fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Default Delivery Address",
        full_name: values.name,
        phone: values.phone,
        line1: values.line1,
        line2: values.line2 || "",
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        is_default: true,
      }),
    }).catch(() => undefined);

    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        items: checkoutItems.map(({ productId, quantity }) => ({ id: productId, quantity })),
        ...(couponCode ? { couponCode } : {}),
        customer: { name: values.name, email: values.email, phone: values.phone, address: { line1: values.line1, line2: values.line2, city: values.city, state: values.state, pincode: values.pincode, country: "India" } },
      }) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error ?? "We could not start checkout.");
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
          if (existingScript && window.Razorpay) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Secure payment is taking longer to load. Please check your connection and try again."));
          document.body.appendChild(script);
        });
      }
      if (!window.Razorpay) throw new Error("Secure payment is unavailable in this browser. Please refresh and try again.");
      const razorpayKey = order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TrjBPlrR7USoQs";
      const checkout = new window.Razorpay({
        key: razorpayKey, amount: order.amountPaise, currency: order.currency, name: "FLOVEXA PERFUMES",
        description: `Order ${order.orderNumber}`, order_id: order.razorpayOrderId,
        prefill: { name: values.name, email: values.email, contact: values.phone }, theme: { color: "#aa8050" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment) => {
          try {
            const verification = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ localOrderId: order.localOrderId, ...payment }) });
            const result = await verification.json();
            if (!verification.ok) throw new Error(result.error ?? "Payment confirmation is pending.");
            try {
              localStorage.removeItem("flovexa-cart");
              window.dispatchEvent(new Event("storage"));
            } catch {
              // storage error ignored
            }
            if (result.order) {
              setConfirmedOrder(result.order);
            } else {
              setSuccess(result.orderStatus === "payment_review" ? `Payment for ${result.orderNumber} reached us. Our team is confirming availability and will update you shortly.` : result.paymentStatus === "captured" ? `Thank you. Your order ${result.orderNumber} is confirmed.` : `Payment for ${result.orderNumber} is authorized and awaiting confirmation.`);
            }
            // IMPORTANT: Keep saved address permanently intact so next purchase is 1-click!
            try {
              localStorage.setItem("flovexa-saved-address", JSON.stringify(values));
            } catch {}
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
    {confirmedOrder ? (
      <div className="checkout-success-container">
        <div className="checkout-success-banner">
          <div className="checkout-success-icon">
            <Check size={28} />
          </div>
          <span className="checkout-success-badge">PAYMENT CAPTURED · PARCEL REGISTERED</span>
          <h2>Payment Successful!</h2>
          <p className="checkout-success-order-num">
            Order Reference: <strong>{confirmedOrder.order_number}</strong>
          </p>
        </div>

        {/* Immediate Shipping Label & Express Courier Allocation */}
        <div className="checkout-shipping-label-card">
          <div className="checkout-shipping-label-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Truck size={18} color="#aa8050" />
              <strong style={{ fontSize: "14px", color: "#1f1a14" }}>
                Express Shipping Label Generated
              </strong>
            </div>
            <span className="checkout-status-pill">
              <Sparkles size={11} /> Ready for Dispatch
            </span>
          </div>

          <div className="checkout-shipping-details-grid">
            <div>
              <span className="cs-label">COURIER PARTNER</span>
              <strong className="cs-val">{confirmedOrder.tracking_carrier || "Mahavir Express"}</strong>
            </div>
            <div>
              <span className="cs-label">AWB / TRACKING NO</span>
              <strong className="cs-val cs-mono">{confirmedOrder.tracking_number || "Assigned upon atelier dispatch"}</strong>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span className="cs-label">DELIVERING TO</span>
              <p className="cs-address">
                <strong>{confirmedOrder.customer_name}</strong>
                <br />
                {confirmedOrder.shipping_address?.line1}
                {confirmedOrder.shipping_address?.line2 ? `, ${confirmedOrder.shipping_address?.line2}` : ""},{" "}
                {confirmedOrder.shipping_address?.city}, {confirmedOrder.shipping_address?.state} -{" "}
                {confirmedOrder.shipping_address?.pincode}
                {confirmedOrder.phone ? ` · Tel: ${confirmedOrder.phone}` : ""}
              </p>
            </div>
          </div>

          <div className="checkout-shipping-actions">
            <button
              type="button"
              className="primary-button checkout-print-btn"
              onClick={() => setShowShippingLabel(true)}
            >
              <Printer size={15} /> View &amp; Print Shipping Label
            </button>
            {confirmedOrder.tracking_url && (
              <Link
                href={confirmedOrder.tracking_url}
                className="checkout-track-btn"
              >
                <ExternalLink size={14} /> Track Delivery Live
              </Link>
            )}
          </div>
          <p className="checkout-note-secure">
            📦 Your parcel shipping label with SKU manifest is generated. Our atelier is packing your crystal flacons in protective velvet gift wrap for delivery.
          </p>
        </div>

        <div className="checkout-success-footer-links">
          <Link href="/account" className="checkout-account-link">
            View in My Orders →
          </Link>
          <Link href="/store" className="checkout-store-link">
            Back to Collection
          </Link>
        </div>

        {/* Printable Thermal Shipping Label Modal */}
        {showShippingLabel && (
          <ShippingLabelModal
            order={confirmedOrder}
            onClose={() => setShowShippingLabel(false)}
          />
        )}
      </div>
    ) : success ? (
      <div className="checkout-success">
        <span>✓</span>
        <h2>Order received</h2>
        <p>{success}</p>
        <Link href="/store">Back to the collection <ArrowRight size={15} /></Link>
      </div>
    ) : (
      <form className="address-form" onSubmit={pay}>
        {savedAddressNotice && (
          <div className="checkout-saved-address-pill">
            <div className="saved-addr-left">
              <span className="saved-addr-badge">✓ SAVED ADDRESS LOADED</span>
              <span>Your delivery details are automatically saved. No need to re-type on every purchase!</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setValues({
                  name: values.name,
                  email: values.email,
                  phone: values.phone,
                  line1: "",
                  line2: "",
                  city: "",
                  state: "",
                  pincode: "",
                });
                setSavedAddressNotice(false);
                try {
                  localStorage.removeItem("flovexa-saved-address");
                } catch {}
              }}
              className="checkout-clear-addr-btn"
            >
              Deliver to different address
            </button>
          </div>
        )}
        <div className="form-section-title"><span>01</span><h2>Contact</h2></div>
        <div className="form-fields"><label className="field-wide">Full name<input autoComplete="name" name="name" required minLength={2} maxLength={100} value={values.name} onChange={change} placeholder="Name for delivery" /></label><label>Email address<input type="email" autoComplete="email" name="email" required value={values.email} onChange={change} placeholder="you@example.com" /></label><label>Mobile number<input type="tel" autoComplete="tel" name="phone" required pattern="[+\d][\d\s()\-]{7,18}" value={values.phone} onChange={change} placeholder="+91 98765 43210" /></label></div>
        <div className="form-section-title"><span>02</span><h2>Delivery address</h2></div>
        <div className="form-fields"><label className="field-wide">Address<input autoComplete="address-line1" name="line1" required minLength={4} maxLength={150} value={values.line1} onChange={change} placeholder="House number and street" /></label><label className="field-wide">Apartment, suite, etc. <small>Optional</small><input autoComplete="address-line2" name="line2" maxLength={150} value={values.line2} onChange={change} placeholder="Apartment, floor, landmark" /></label><label>City<input autoComplete="address-level2" name="city" required value={values.city} onChange={change} /></label><label>State<input autoComplete="address-level1" name="state" required value={values.state} onChange={change} /></label><label>PIN code<input autoComplete="postal-code" name="pincode" required pattern="\d{6}" inputMode="numeric" value={values.pincode} onChange={change} placeholder="6-digit PIN" /></label></div>
        {message && <p className="checkout-message" role="alert">{message}</p>}
        <button className="primary-button pay-button" type="submit" disabled={busy}>{busy ? "Opening secure Razorpay…" : "Continue to secure payment"}<ArrowRight size={16} /></button>
        <p className="payment-assurance"><LockKeyhole size={13} /> Card and UPI payments are handled securely by Razorpay. We never store card details.</p>
      </form>
    )}
  </>;
}
