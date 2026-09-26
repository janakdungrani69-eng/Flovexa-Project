import Storefront from "@/components/storefront";
import { getProducts } from "@/lib/catalog";

export default async function HomePage() {
  const products = await getProducts();
  return <Storefront products={products} />;
}
