import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/catalog";
import { canonicalUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const publicProducts = products.filter((product) => product.active && !product.id.startsWith("demo-"));

  return [
    { url: canonicalUrl("/"), changeFrequency: "daily", priority: 1.0 },
    { url: canonicalUrl("/store"), changeFrequency: "daily", priority: 0.9 },
    { url: canonicalUrl("/seller"), changeFrequency: "weekly", priority: 0.8 },
    ...publicProducts.map((product) => ({
      url: canonicalUrl(`/products/${product.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(product.imageUrl ? { images: [product.imageUrl] } : {}),
    })),
  ];
}
