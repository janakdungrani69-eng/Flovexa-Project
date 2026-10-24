import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canonicalUrl, noIndexMetadata } from "@/lib/seo";

const pages = {
  shipping: { title: "Shipping & delivery", label: "DELIVERY" },
  returns: { title: "Returns & refunds", label: "ORDER CARE" },
  contact: { title: "Contact us", label: "WE’RE HERE TO HELP" },
  privacy: { title: "Privacy policy", label: "YOUR PRIVACY" },
  terms: { title: "Terms of service", label: "THE DETAILS" },
  about: { title: "Our story", label: "FLOVEXA PERFUMES" },
} as const;

type PageSlug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => {
    if (!(slug in pages)) return noIndexMetadata("Page not found", true);
    const page = pages[slug as PageSlug];
    return {
      ...noIndexMetadata(page.title, true),
      description: `${page.title} information for Flovexa Perfumes is being prepared.`,
      alternates: { canonical: canonicalUrl(`/${slug}`) },
    };
  });
}

export default async function InformationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in pages)) notFound();
  const page = pages[slug as PageSlug];

  return <main className="orders-page">
    <header className="checkout-header"><Link href="/store" className="checkout-back">← Back to Flovexa</Link><Link href="/store" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><span className="secure-label">INFORMATION</span></header>
    <section className="orders-content">
      <span className="eyebrow">{page.label}</span>
      <h1>{page.title}</h1>
      {slug === "returns" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px", lineHeight: "1.8", color: "#50473e", fontSize: "12px" }}>
          <p>
            <strong>1. Cancellation Window (Within 24 Hours Only):</strong>
            <br />
            Customers can cancel their perfume order directly from their account dashboard within <strong>24 hours</strong> of placing the order. Once 24 hours have elapsed, the order enters active bottling and packaging at our atelier and cannot be cancelled.
          </p>
          <p>
            <strong>2. Strict No-Return Policy:</strong>
            <br />
            Due to the intimate personal nature of fine fragrance extracts, attars, and sealed crystal flacons, Flovexa Perfumes maintains a strict <strong>No-Return Policy</strong> once an order has been dispatched or delivered. We do not accept returns or exchanges.
          </p>
          <p>
            <strong>3. Transit Protection &amp; Broken Seal Claims:</strong>
            <br />
            All packages are dispatched via <strong>Shree Mahavir Courier</strong> in tamper-evident packaging. In the rare event of transit damage or shattered glass during shipment, notify our concierge within 24 hours of delivery with photographic parcel proof for an immediate replacement.
          </p>
        </div>
      ) : (
        <>
          <p>This information is being prepared for the Flovexa Perfumes launch. Please check back before placing an order.</p>
          <p>Online orders are not being accepted until the store’s delivery, customer care, and applicable policy details have been published.</p>
        </>
      )}
      <div style={{ marginTop: "24px" }}>
        <Link className="primary-button" href="/store">Return to the collection</Link>
      </div>
    </section>
    <footer className="checkout-footer"><span>© {new Date().getFullYear()} FLOVEXA PERFUMES</span><Link href="/orders">Order care</Link><Link href="/store">Shop</Link></footer>
  </main>;
}
