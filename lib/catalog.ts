import "server-only";
import { createClient } from "@supabase/supabase-js";
import { sampleProducts, type Product } from "@/lib/products";

export async function getProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return process.env.NODE_ENV === "production" ? [] : sampleProducts;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, featured, active")
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product catalogue query failed", error.message);
    return process.env.NODE_ENV === "production" ? [] : sampleProducts;
  }
  return (data ?? []).map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    pricePaise: product.price_paise,
    compareAtPaise: product.compare_at_paise ?? undefined,
    size: product.size,
    concentration: product.concentration,
    notes: product.notes,
    description: product.description,
    imageUrl: product.image_url,
    accent: product.accent,
    featured: product.featured,
    active: product.active,
  }));
}
