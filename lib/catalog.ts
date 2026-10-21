import "server-only";
import { createClient } from "@supabase/supabase-js";
import { extractProductVariants, type Product } from "@/lib/products";

function parseStoredImages(imageUrl: string | null): { primary: string | null; all: string[] } {
  if (!imageUrl) return { primary: null, all: [] };
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { primary: parsed[0] || null, all: parsed.filter(Boolean) };
      }
    } catch {}
  }
  if (trimmed.includes(",")) {
    const list = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length > 0) return { primary: list[0] || null, all: list };
  }
  return { primary: trimmed, all: [trimmed] };
}

export async function getProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, stock, featured, active")
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product catalogue query failed", error.message);
    return [];
  }
  return (data ?? []).map((product) => {
    const { primary, all } = parseStoredImages(product.image_url);
    const { cleanDescription, variants } = extractProductVariants(product.description, {
      name: product.name,
      size: product.size,
      pricePaise: product.price_paise,
      compareAtPaise: product.compare_at_paise ?? undefined,
      stock: product.stock,
      imageUrl: primary,
      images: all,
    });

    return {
      id: product.id,
      sku: variants[0]?.sku,
      slug: product.slug,
      name: product.name,
      category: product.category,
      pricePaise: product.price_paise,
      compareAtPaise: product.compare_at_paise ?? undefined,
      size: product.size,
      concentration: product.concentration,
      notes: product.notes,
      description: cleanDescription,
      imageUrl: primary,
      images: all,
      accent: product.accent,
      stock: product.stock,
      featured: product.featured,
      active: product.active,
      variants,
    };
  });
}
