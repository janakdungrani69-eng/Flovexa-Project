import Link from "next/link";
import OrderLookup from "@/components/order-lookup";

export default function OrdersPage() {
  return <main className="orders-page"><header className="checkout-header"><Link href="/" className="checkout-back">← Back to Flovexa</Link><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><span className="secure-label">ORDER SUPPORT</span></header><section className="orders-content"><span className="eyebrow">WE’RE HERE TO HELP</span><h1>Track your <em>order.</em></h1><p>Enter your order number and the email address used at checkout to see the latest status.</p><OrderLookup/></section><footer className="checkout-footer"><span>© {new Date().getFullYear()} FLOVEXA PERFUMES</span><Link href="/shipping">Shipping</Link><Link href="/returns">Returns</Link><Link href="/contact">Contact</Link></footer></main>;
}
