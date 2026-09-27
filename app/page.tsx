import Storefront from "@/components/storefront";
import { getProducts } from "@/lib/catalog";
import { getStorefrontContent } from "@/lib/storefront-content-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, content] = await Promise.all([getProducts(), getStorefrontContent()]);
  return <Storefront products={products} categories={content.categories} settings={content.settings} />;
}
