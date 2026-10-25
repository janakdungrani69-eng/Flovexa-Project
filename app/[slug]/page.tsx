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
            All packages are dispatched via <strong>Priority Insured Express Logistics</strong> in tamper-evident packaging. In the rare event of transit damage or shattered glass during shipment, notify our concierge within 24 hours of delivery with photographic parcel proof for an immediate replacement.
          </p>
        </div>
      ) : slug === "contact" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "18px", lineHeight: "1.7", color: "#453c33", fontSize: "13px" }}>
          <p>
            Have a question regarding our artisanal fragrance formulations, batch curation, bespoke gifting, or an existing order? Our concierge is at your service.
          </p>

          <div style={{
            background: "#fffdf9",
            border: "1px solid #e8decb",
            borderRadius: "10px",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}>
            <div>
              <strong style={{ display: "block", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#927b68", marginBottom: "4px" }}>
                Registered Office &amp; Atelier
              </strong>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1f1812", letterSpacing: "0.05em" }}>
                FLOVEXA® PARFUM
                <span style={{ display: "block", fontSize: "10.5px", letterSpacing: "0.22em", color: "#aa8050", fontWeight: 600, marginTop: "2px" }}>
                  SCENTS THAT STAY
                </span>
              </div>
              <div style={{ color: "#564b40", marginTop: "4px" }}>
                <strong>Packed &amp; Marketed by:</strong> FLOVEXA<br />
                <strong>Address:</strong> Surat, Gujarat – 395006<br />
                <span style={{ fontSize: "11px", color: "#7a6e60" }}>
                  21, Ramdev Row-House Shopping, Opp. Shivdhara Society, Rajmandir Road
                </span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #f0e6d6", paddingTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div>
                <strong style={{ display: "block", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#927b68", marginBottom: "2px" }}>
                  Customer Helpline / Phone
                </strong>
                <a href="tel:+919662765757" style={{ color: "#74512e", fontWeight: 600, textDecoration: "none" }}>
                  +91 96627 65757
                </a>
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#927b68", marginBottom: "2px" }}>
                  Official Email
                </strong>
                <a href="mailto:flovexaenterprises@gmail.com" style={{ color: "#74512e", fontWeight: 600, textDecoration: "none" }}>
                  flovexaenterprises@gmail.com
                </a>
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#927b68", marginBottom: "2px" }}>
                  Official Instagram
                </strong>
                <a href="https://www.instagram.com/flovexa_perfume" target="_blank" rel="noreferrer" style={{ color: "#74512e", fontWeight: 600, textDecoration: "none" }}>
                  @flovexa_perfume ↗
                </a>
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#927b68", marginBottom: "2px" }}>
                  Concierge Operating Hours
                </strong>
                <span style={{ color: "#564b40" }}>
                  Mon – Sat · 10:00 AM – 7:00 PM IST
                </span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #f0e6d6", paddingTop: "12px" }}>
              <a
                href="https://wa.me/919662765757?text=Hello%20Flovexa%20Concierge,%20I%20have%20an%20inquiry%20regarding%20my%20perfume%20order"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#25d366",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  padding: "10px 18px",
                  borderRadius: "6px",
                  textDecoration: "none"
                }}
              >
                💬 Chat with Concierge on WhatsApp (+91 96627 65757)
              </a>
            </div>
          </div>
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
