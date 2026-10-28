"use client";

import Script from "next/script";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, CreditCard, Lock } from "lucide-react";

export default function RazorpayTestPage() {
  const [amountRupees, setAmountRupees] = useState("1");
  const [customerName, setCustomerName] = useState("Flovexa Patron");
  const [customerEmail, setCustomerEmail] = useState("customer@flovexa.com");
  const [customerPhone, setCustomerPhone] = useState("+91 98765 43210");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
    details?: any;
  }>({ status: "idle", message: "" });

  async function handleTestPay() {
    setBusy(true);
    setResult({ status: "idle", message: "" });

    try {
      const amountPaise = Math.round(parseFloat(amountRupees) * 100);
      if (isNaN(amountPaise) || amountPaise < 100) {
        throw new Error("Minimum amount must be at least ₹1 (100 paise).");
      }

      // STEP 1: Call Backend to Create Order
      const createRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `test_rcpt_${Date.now()}`,
          notes: { test_mode: "true", brand: "Flovexa Perfumes" },
        }),
      });

      const orderData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(orderData.error || "Failed to create Razorpay order.");
      }

      const { order_id, amount, currency, key_id } = orderData;

      if (!(window as any).Razorpay) {
        throw new Error("Razorpay SDK not loaded. Please ensure you have internet access and refresh.");
      }

      // STEP 2: Open Razorpay Checkout Modal
      const options = {
        key: key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_TtQFGzbYvWgZ83",
        amount,
        currency,
        name: "Flovexa Perfumes",
        description: `Artisanal Fragrance Test Payment (₹${(amount / 100).toFixed(2)})`,
        order_id,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: "#aa8050",
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setResult({
              status: "error",
              message: "Payment modal was closed by user.",
            });
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // STEP 3: Verify Payment Signature on Backend
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment signature verification failed.");
            }

            setResult({
              status: "success",
              message: "Payment successful & HMAC signature verified!",
              details: {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              },
            });
          } catch (err: any) {
            setResult({
              status: "error",
              message: err.message || "Failed to verify payment signature.",
            });
          } finally {
            setBusy(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setBusy(false);
        setResult({
          status: "error",
          message: response.error?.description || "Payment failed at bank gateway.",
        });
      });

      rzp.open();
    } catch (err: any) {
      setBusy(false);
      setResult({
        status: "error",
        message: err.message || "An unexpected error occurred.",
      });
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0c0a",
        color: "#f4f1ea",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#161411",
          borderRadius: 16,
          border: "1px solid rgba(212, 175, 55, 0.25)",
          padding: 32,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#aa8050",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            FLOVEXA PERFUMES
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px 0", color: "#fff" }}>
            Razorpay Checkout Test
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            Standard Web Checkout Integration Verification
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#d1c7b7", marginBottom: 6 }}>
              Test Amount (₹ INR)
            </label>
            <input
              type="number"
              min="1"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0d0c0a",
                border: "1px solid #332d24",
                borderRadius: 8,
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#d1c7b7", marginBottom: 6 }}>
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0d0c0a",
                border: "1px solid #332d24",
                borderRadius: 8,
                color: "#fff",
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#d1c7b7", marginBottom: 6 }}>
              Email &amp; Mobile
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={{
                  padding: "10px 14px",
                  background: "#0d0c0a",
                  border: "1px solid #332d24",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{
                  padding: "10px 14px",
                  background: "#0d0c0a",
                  border: "1px solid #332d24",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              background: "#1e1b16",
              borderRadius: 8,
              border: "1px solid #383125",
              fontSize: 11,
              color: "#c2b8a7",
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#aa8050", fontWeight: 600, marginBottom: 4 }}>
              <ShieldCheck size={14} /> Active Credentials
            </div>
            <div>Key ID: <code>rzp_live_TtQFGzbYvWgZ83</code></div>
            <div>Webhook &amp; Verification: HMAC-SHA256 Active</div>
          </div>

          <button
            type="button"
            onClick={handleTestPay}
            disabled={busy}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: "linear-gradient(135deg, #c59b63, #9e743d)",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.03em",
              cursor: busy ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 15px rgba(170, 128, 80, 0.3)",
              opacity: busy ? 0.7 : 1,
            }}
          >
            <CreditCard size={16} />
            <span>{busy ? "Opening Gateway…" : `Pay ₹${amountRupees} with Razorpay`}</span>
          </button>

          {result.status === "success" && (
            <div
              style={{
                padding: 14,
                background: "#064e3b",
                border: "1px solid #059669",
                borderRadius: 8,
                color: "#ecfdf5",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 4 }}>
                <CheckCircle2 size={16} /> {result.message}
              </div>
              {result.details && (
                <div style={{ fontSize: 11, color: "#a7f3d0", wordBreak: "break-all" }}>
                  <div>Payment ID: {result.details.paymentId}</div>
                  <div>Order ID: {result.details.orderId}</div>
                </div>
              )}
            </div>
          )}

          {result.status === "error" && (
            <div
              style={{
                padding: 14,
                background: "#450a0a",
                border: "1px solid #dc2626",
                borderRadius: 8,
                color: "#fef2f2",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                <AlertCircle size={16} /> {result.message}
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 8 }}>
            <Link
              href="/store"
              style={{
                fontSize: 12,
                color: "#aa8050",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Return to Flovexa Storefront <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

