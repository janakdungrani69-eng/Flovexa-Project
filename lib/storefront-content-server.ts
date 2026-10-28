import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { DEFAULT_CATEGORIES, DEFAULT_STOREFRONT_SETTINGS } from "@/lib/storefront-content";

export async function getStorefrontContent() {
  try {
    const supabase = createAdminSupabase();
    const [settingsResult, categoriesResult] = await Promise.all([
      supabase.from("storefront_settings").select("hero_image_url, announcement, eyebrow, title, title_emphasis, description, cta_label, caption_one, caption_two").eq("id", "home").maybeSingle(),
      supabase.from("store_categories").select("id, name").eq("active", true).order("sort_order", { ascending: true }),
    ]);

    const rawCategories = (categoriesResult.data ?? []).map((item) => item.name);
    const hasLegacy = rawCategories.some((c) => ["For Her", "For Him", "Unisex", "Oud & Attar", "Discovery Sets"].includes(c));

    let categories = DEFAULT_CATEGORIES;
    if (hasLegacy) {
      try {
        void supabase.from("store_categories").delete().neq("id", "00000000-0000-0000-0000-000000000000").then(async () => {
          await supabase.from("store_categories").insert([
            { name: "Scents", sort_order: 1, active: true },
            { name: "Fragrance Oils", sort_order: 2, active: true },
          ]);
        });
      } catch {
        // ignore background sync error
      }
      categories = DEFAULT_CATEGORIES;
    } else if (rawCategories.length > 0) {
      categories = rawCategories;
    }

    return {
      settings: { ...DEFAULT_STOREFRONT_SETTINGS, ...(settingsResult.data ?? {}) },
      categories,
    };
  } catch { return { settings: DEFAULT_STOREFRONT_SETTINGS, categories: DEFAULT_CATEGORIES }; }
}
