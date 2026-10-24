import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/json-ld";
import CheckoutBackButton from "@/components/checkout-back-button";
import ProductPurchasePanel from "@/components/product-purchase-panel";
import ProductLuxuryDetails from "@/components/product-luxury-details";
import ProductGallery from "@/components/product-gallery";
import { getProducts } from "@/lib/catalog";
import { canonicalUrl, metaDescription, noIndexMetadata } from "@/lib/seo";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, products] = await Promise.all([params, getProducts()]);
  const product = products.find((item) => item.slug === slug || (slug === "dhukan" && item.slug.includes("dhukan")) || (item.slug === "dhukan" && slug.includes("dhukan")));
  if (!product) return noIndexMetadata("Fragrance not found");
  const description = metaDescription(`${product.name}: ${product.description}`);
  const canonical = canonicalUrl(`/products/${product.slug}`);
  const images = product.imageUrl ? [product.imageUrl] : undefined;
  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: { title: product.name, description, url: canonical, images },
    twitter: { card: images ? "summary_large_image" : "summary", title: product.name, description, images },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  // Browsing is public - buyers can view product details without login
  const { slug } = await params;
  const products = await getProducts();
  const product = products.find((item) => item.slug === slug || (slug === "dhukan" && item.slug.includes("dhukan")) || (item.slug === "dhukan" && slug.includes("dhukan")));
  if (!product) notFound();
  const productUrl = canonicalUrl(`/products/${product.slug}`);

  // Fetch verified reviews for this fragrance from Supabase
  let verifiedReviews: Array<{
    id?: string;
    author: string;
    rating: number;
    date: string;
    title: string;
    body: string;
    location: string;
  }> = [];

  try {
    const supabase = createAdminSupabase();
    const { data: dbReviews } = await supabase
      .from("product_reviews")
      .select("id, customer_name, location, rating, title, comment, created_at")
      .eq("status", "approved")
      .or(`product_id.eq.${product.id},product_slug.eq.${product.slug},product_name.ilike.%${product.name}%`)
      .order("created_at", { ascending: false })
      .limit(25);

    if (dbReviews && dbReviews.length > 0) {
      verifiedReviews = dbReviews.map((r: any) => ({
        id: r.id,
        author: r.customer_name || "Verified Customer",
        rating: r.rating || 5,
        date: new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
        title: r.title || "Exceptional luxury fragrance",
        body: r.comment || "",
        location: r.location || "India",
      }));
    }
  } catch {
    // Graceful fallback if table is newly initializing
  }

  return (
    <main className="detail-page detail-page-luxe">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: product.name,
              description: product.description,
              ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
              sku: product.sku || product.variants?.[0]?.sku || product.id,
              category: product.category,
              size: product.size,
              brand: { "@type": "Brand", name: "Flovexa Perfumes" },
              offers: {
                "@type": "Offer",
                url: productUrl,
                priceCurrency: "INR",
                price: (product.pricePaise / 100).toFixed(2),
                itemCondition: "https://schema.org/NewCondition",
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/store") },
                { "@type": "ListItem", position: 2, name: "The collection", item: canonicalUrl("/store#collection") },
                { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
              ],
            },
          ],
        }}
      />

      <header className="checkout-header detail-header">
        <CheckoutBackButton label="Go back" fallback="/store#collection" />
        <Link href="/store" className="wordmark">
          FLOVEXA<span>PERFUMES</span>
        </Link>
        <span aria-hidden="true" />
      </header>

      <section className="product-stage">
        <ProductGallery product={product} />

        <div className="product-info-panel">
          <ProductPurchasePanel product={product} />
        </div>
      </section>

      <ProductLuxuryDetails
        product={product}
        relatedProducts={products.filter((item) => item.slug !== product.slug && item.active !== false)}
        verifiedReviews={verifiedReviews}
      />
    </main>
  );
}
