import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Feather, Flower2, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { BottleArt } from "@/components/storefront";
import ProductActions from "@/components/product-actions";
import { getProducts } from "@/lib/catalog";
import { money } from "@/lib/money";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, products] = await Promise.all([params, getProducts()]);
  const product = products.find((item) => item.slug === slug);
  if (!product) return { title: "Fragrance not found" };
  return { title: product.name, description: `${product.name}: ${product.description}`, openGraph: { images: product.imageUrl ? [product.imageUrl] : [] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, products] = await Promise.all([params, getProducts()]);
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  return <main className="detail-page">
    <header className="checkout-header detail-header"><Link href="/#collection" className="checkout-back"><ArrowLeft size={16} /> Back to collection</Link><Link href="/" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><Link href="/#collection" className="detail-bag-link">SHOP SCENTS <ArrowRight size={14} /></Link></header>
    <div className="detail-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#collection">The collection</Link><span>/</span><span>{product.name}</span></div>
    <section className="detail-layout"><div className="detail-gallery"><div className="detail-main-image"><BottleArt product={product} hero /><span className="detail-image-caption">FLOVEXA PERFUMES · THE SIGNATURE COLLECTION</span></div><div className="detail-image-note"><span>SCENT PROFILE</span><span>{product.notes.join(" · ")}</span></div></div>
      <div className="detail-copy"><span className="eyebrow">{product.category.toUpperCase()} · {product.concentration.toUpperCase()}</span><h1>{product.name}</h1><p className="detail-subtitle">A fragrance that stays with you.</p><div className="detail-price">{money(product.pricePaise)} <span>INR</span></div><p className="detail-description">{product.description}</p><div className="detail-size"><span>SIZE</span><b>{product.size}</b></div><ProductActions product={product} /><div className="detail-divider"/><div className="detail-notes-head"><span className="eyebrow">THE COMPOSITION</span><h2>Notes that <em>unfold.</em></h2></div><div className="notes-list">{product.notes.map((note, index) => <div key={note}><span>0{index + 1}</span><b>{note}</b><small>{index === 0 ? "FIRST IMPRESSION" : index === product.notes.length - 1 ? "THE LASTING TRAIL" : "THE HEART"}</small></div>)}</div><div className="detail-promises"><div><Sparkles size={16}/><span>COMPOSED TO BE REMEMBERED</span></div><div><Feather size={16}/><span>DISCOVER YOUR OWN RITUAL</span></div><div><Flower2 size={16}/><span>EXPLORE EACH NOTE</span></div></div></div>
    </section>
    <section className="detail-more"><div><span className="eyebrow">YOUR NEXT DISCOVERY</span><h2>Find another <em>feeling.</em></h2></div><Link href="/#collection">View all fragrances <ArrowRight size={15}/></Link></section>
    <footer className="checkout-footer"><span>© {new Date().getFullYear()} FLOVEXA PERFUMES</span><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/returns">Returns</Link></footer>
  </main>;
}
