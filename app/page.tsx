import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import Storefront, { type FeaturedStoreReview } from "@/components/storefront";
import { getProducts } from "@/lib/catalog";
import { canonicalUrl } from "@/lib/seo";
import { getStorefrontContent } from "@/lib/storefront-content-server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Flovexa — Luxury Perfumes & Pure Fragrance Oils | Official Store",
  description:
    "Official website of Flovexa. Discover luxury artisanal Eau de Parfums and pure concentrated fragrance oils crafted in Surat, India with pure European extracts. Fast pan-India delivery.",
  keywords: [
    "Flovexa",
    "Flovexa Perfumes",
    "Flovexa Official",
    "Flovexa India",
    "Buy Perfume Online India",
    "Luxury Perfumes India",
    "Flovexa Fragrance",
    "Eau de Parfum India",
    "Pure fragrance oils India",
    "flovexa.in",
  ],
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: "Flovexa — Luxury Perfumes & Pure Fragrance Oils",
    description:
      "Official website of Flovexa. Discover luxury artisanal Eau de Parfums and pure concentrated fragrance oils crafted in India with pure European extracts.",
    url: canonicalUrl("/"),
    type: "website",
    siteName: "Flovexa",
    images: [
      {
        url: canonicalUrl("/icon.png"),
        width: 512,
        height: 512,
        alt: "Flovexa Luxury Perfumes",
      },
    ],
  },
  robots: { index: true, follow: true },
};

export default async function RootHomePage() {
  const [products, content] = await Promise.all([getProducts(), getStorefrontContent()]);

  // Dynamic Sales Volume: Real Supabase orders aggregated by product + baseline count
  const baseSales: Record<string, number> = {
    "flovexa-dhukan-eau-de-perfume-50ml": 384,
    "flovexa-aqua-blue-premium-fragrance-oil": 242,
    "flovexa-noir-royale-eau-de-parfum": 186,
  };

  const dbSalesMap: Record<string, number> = {};
  let featuredReviews: FeaturedStoreReview[] = [];

  try {
    const supabase = createAdminSupabase();

    // 1. Fetch live order items to calculate dynamic real-time sales per perfume
    const { data: orderItemRows } = await supabase
      .from("order_items")
      .select("product_id, product_name, quantity");

    for (const item of orderItemRows || []) {
      const q = item.quantity || 1;
      if (item.product_id) {
        dbSalesMap[item.product_id] = (dbSalesMap[item.product_id] || 0) + q;
      }
      if (item.product_name) {
        const norm = item.product_name.trim().toLowerCase();
        dbSalesMap[norm] = (dbSalesMap[norm] || 0) + q;
      }
    }

    // 2. Fetch approved customer reviews
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
  } catch (err) {
    console.warn("Homepage dynamic sales/reviews query handled:", err);
  }

  // Attach dynamic real-time salesCount to each product
  const enrichedProducts = products.map((prod) => {
    const base = baseSales[prod.slug] || 120;
    const realByPid = dbSalesMap[prod.id] || 0;
    const realByName = dbSalesMap[prod.name.trim().toLowerCase()] || 0;
    const realSales = Math.max(realByPid, realByName);
    return {
      ...prod,
      salesCount: base + realSales,
    };
  });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${canonicalUrl("/")}#website`,
              name: "Flovexa",
              alternateName: ["Flovexa Perfumes", "Flovexa Official Store", "Flovexa India", "flovexa.in"],
              url: canonicalUrl("/"),
              description: "Official luxury fragrance and customer shopping destination for Flovexa Perfumes.",
            },
            {
              "@type": "Organization",
              "@id": `${canonicalUrl("/")}#organization`,
              name: "Flovexa",
              legalName: "Flovexa Perfumes",
              url: canonicalUrl("/"),
              logo: canonicalUrl("/icon.png"),
            },
          ],
        }}
      />
      <Storefront
        products={enrichedProducts}
        categories={content.categories}
        settings={content.settings}
        featuredReviews={featuredReviews}
      />
    </>
  );
}
