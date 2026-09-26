import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  return params.then(({ slug }) => ({ title: slug in pages ? pages[slug as PageSlug].title : "Page not found" }));
}

export default async function InformationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in pages)) notFound();
  const page = pages[slug as PageSlug];

  return <main className="orders-page">
    <header className="checkout-header"><Link href="/" className="checkout-back">← Back to Flovexa</Link><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><span className="secure-label">INFORMATION</span></header>
    <section className="orders-content"><span className="eyebrow">{page.label}</span><h1>{page.title}</h1><p>This information is being prepared for the Flovexa Perfumes launch. Please check back before placing an order.</p><p>Online orders are not being accepted until the store’s delivery, customer care, and applicable policy details have been published.</p><Link className="primary-button" href="/">Return to the collection</Link></section>
    <footer className="checkout-footer"><span>© {new Date().getFullYear()} FLOVEXA PERFUMES</span><Link href="/orders">Order care</Link><Link href="/">Shop</Link></footer>
  </main>;
}
