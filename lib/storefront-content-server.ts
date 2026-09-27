import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { DEFAULT_CATEGORIES, DEFAULT_STOREFRONT_SETTINGS } from "@/lib/storefront-content";

export async function getStorefrontContent() {
  try {
    const supabase = createAdminSupabase();
    const [settingsResult, categoriesResult] = await Promise.all([
      supabase.from("storefront_settings").select("hero_image_url, announcement, eyebrow, title, title_emphasis, description, cta_label, caption_one, caption_two").eq("id", "home").maybeSingle(),
      supabase.from("store_categories").select("name").eq("active", true).order("sort_order", { ascending: true }),
    ]);
    return {
      settings: { ...DEFAULT_STOREFRONT_SETTINGS, ...(settingsResult.data ?? {}) },
      categories: categoriesResult.error ? DEFAULT_CATEGORIES : (categoriesResult.data ?? []).map((item) => item.name),
    };
  } catch { return { settings: DEFAULT_STOREFRONT_SETTINGS, categories: DEFAULT_CATEGORIES }; }
}
