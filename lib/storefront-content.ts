export const DEFAULT_CATEGORIES = ["For Her", "For Him", "Unisex", "Oud & Attar", "Discovery Sets"];

export type StorefrontSettings = {
  hero_image_url: string;
  announcement: string;
  eyebrow: string;
  title: string;
  title_emphasis: string;
  description: string;
  cta_label: string;
  caption_one: string;
  caption_two: string;
};

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  hero_image_url: "",
  announcement: "A more personal way to discover fragrance",
  eyebrow: "THE ART OF A LASTING IMPRESSION",
  title: "Wear the feeling.",
  title_emphasis: "Keep the memory.",
  description: "Fragrance is the quietest way to tell your story. Find a scent that feels like it was always yours.",
  cta_label: "Discover your scent",
  caption_one: "01 / THE SIGNATURE COLLECTION",
  caption_two: "SCENT, MADE PERSONAL",
};
