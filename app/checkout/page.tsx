import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CheckoutForm from "@/components/checkout-form";
import { getProducts } from "@/lib/catalog";
import { calculateOrderPricing, getPricingConfig } from "@/lib/pricing";

type CartLine = { productId: string; quantity: number };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

function parseCart(value?: string): CartLine[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((line): CartLine[] => {
      if (!line || typeof line.productId !== "string" || !Number.isInteger(line.quantity)) return [];
      return [{ productId: line.productId, quantity: Math.max(1, Math.min(20, line.quantity)) }];
    }).slice(0, 20);
  } catch { return []; }
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ items?: string }> }) {
  const [{ items }, products] = await Promise.all([searchParams, getProducts()]);
  const requested = parseCart(items);
  const lines = requested.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? [{ product, quantity: item.quantity }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.pricePaise * line.quantity, 0);
  const pricingConfig = getPricingConfig();
  const pricing = pricingConfig ? calculateOrderPricing(subtotal, pricingConfig) : null;
  const hasRealProductIds = lines.length > 0 && lines.every((line) => !line.product.id.startsWith("demo-"));
  const paymentKeyIsLive = process.env.NODE_ENV !== "production" || process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_");
  const serverConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RESEND_API_KEY && process.env.ORDER_FROM_EMAIL &&
    process.env.ORDER_LOOKUP_PEPPER && process.env.NEXT_PUBLIC_SITE_URL && pricingConfig && paymentKeyIsLive,
  );
  const checkoutReady = hasRealProductIds && serverConfigured;

  return <main className="checkout-page">
    <header className="checkout-header"><Link href="/" className="checkout-back"><ArrowLeft size={16} /> Continue shopping</Link><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><span className="secure-label">SECURE CHECKOUT</span></header>
    <div className="checkout-layout">
      <section className="checkout-main"><span className="eyebrow">ALMOST YOURS</span><h1>Delivery details</h1><p className="checkout-lede">Tell us where to send your fragrance.</p>
        <CheckoutForm items={requested} enabled={checkoutReady} />
      </section>
      <aside className="order-summary"><span className="eyebrow">YOUR SELECTION</span><h2>Order summary</h2>
        {lines.length ? <div className="summary-lines">{lines.map(({ product, quantity }) => <div className="summary-product" key={product.id}><div className="summary-product-visual" style={{ "--juice": product.accent } as React.CSSProperties}><span>F</span></div><div><b>{product.name}</b><small>{product.size} · Qty {quantity}</small></div><strong>{money(product.pricePaise * quantity)}</strong></div>)}</div> : <div className="summary-empty">Your bag is empty. <Link href="/#collection">Explore fragrances</Link></div>}
        <div className="summary-costs"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>{pricing ? <><div><span>Shipping</span><strong>{pricing.shippingPaise ? money(pricing.shippingPaise) : "Complimentary"}</strong></div>{pricing.taxPaise > 0 && <div><span>{pricing.taxIncluded ? "Included taxes" : "Taxes"}</span><strong>{money(pricing.taxPaise)}</strong></div>}<div className="summary-total"><span>Total</span><strong>{money(pricing.totalPaise)}</strong></div></> : <p className="summary-note">Shipping and tax settings are being configured. The payment button stays disabled until the total can be confirmed.</p>}</div>
      </aside>
    </div>
    <footer className="checkout-footer"><span>© {new Date().getFullYear()} FLOVEXA PERFUMES</span><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/returns">Returns</Link></footer>
  </main>;
}
