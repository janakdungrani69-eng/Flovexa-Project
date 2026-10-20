import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import Storefront from "@/components/storefront";
import { getProducts } from "@/lib/catalog";
import { canonicalUrl } from "@/lib/seo";
import { getStorefrontContent } from "@/lib/storefront-content-server";

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
  const [products, content] = await Promise.all([getProducts(), getStorefrontContent()]);
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
      <Storefront products={products} categories={content.categories} settings={content.settings} />
    </>
  );
}

