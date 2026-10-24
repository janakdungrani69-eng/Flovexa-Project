import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import Storefront, { type FeaturedStoreReview } from "@/components/storefront";
import { getProducts } from "@/lib/catalog";
import { canonicalUrl } from "@/lib/seo";
import { getStorefrontContent } from "@/lib/storefront-content-server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Flovexa Perfumes — Official Customer Store | Luxury Fragrances & Oils India",
  description: "Official customer storefront for Flovexa luxury Eau de Parfums and pure concentrated fragrance oils. 100% authentic, long-lasting luxury scents crafted in India with fast pan-India delivery.",
  keywords: [
    "Flovexa",
    "Flovexa Store",
    "Flovexa Customer Store",
    "Flovexa Perfumes",
    "Flovexa Fragrance",
    "Buy Perfume Online India",
    "Luxury Perfumes India",
    "Flovexa Official Store",
    "Flovexa Buyer Store",
    "Eau de Parfum India",
    "Pure fragrance oils India",
  ],
  alternates: { canonical: canonicalUrl("/store") },
  openGraph: {
    title: "Flovexa Perfumes — Official Customer Store",
    description: "Shop official Flovexa luxury Eau de Parfums and concentrated fragrance oils. 100% authentic long-lasting scents.",
    url: canonicalUrl("/store"),
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function StorePage() {
  // Browsing is public - buyers can view all products without login
  const [products, content] = await Promise.all([getProducts(), getStorefrontContent()]);

  // Fetch verified customer reviews featured for the main storefront
  let featuredReviews: FeaturedStoreReview[] = [];
  try {
    const supabase = createAdminSupabase();
    const { data: dbReviews } = await supabase
      .from("product_reviews")
      .select("id, customer_name, location, rating, title, comment, created_at, product_name, product_slug")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);

    if (dbReviews && dbReviews.length > 0) {
      featuredReviews = dbReviews.map((r: any) => ({
        id: r.id,
        author: r.customer_name || "Verified Buyer",
        city: r.location || "India",
        product: r.product_name || "Flovexa Fragrance",
        productSlug: r.product_slug,
        quote: r.comment || r.title || "Exceptional fragrance with stunning sillage.",
        rating: r.rating || 5,
        date: r.created_at,
      }));
    }
  } catch (revError) {
    console.warn("Storefront reviews query handled:", revError);
  }

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "Flovexa Perfumes - Customer Store",
              alternateName: ["Flovexa", "Flovexa Official Store", "Flovexa Store", "Flovexa Fragrance"],
              url: canonicalUrl("/store"),
              description: "Flovexa official luxury fragrance and customer shopping destination in India.",
            },
            {
              "@type": "Organization",
              name: "Flovexa Perfumes",
              url: canonicalUrl("/store"),
              logo: canonicalUrl("/products/flovexa-luxury-box.jpg"),
            },
          ],
        }}
      />
      <Storefront
        products={products}
        categories={content.categories}
        settings={content.settings}
        featuredReviews={featuredReviews}
      />
    </>
  );
}
