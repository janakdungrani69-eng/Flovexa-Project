export const DEFAULT_CATEGORIES = ["Perfume", "Fragrance"];

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
  announcement: "Luxury Eau de Parfums & Pure Fragrance Oils · Fast Dispatch",
  eyebrow: "THE ART OF A LASTING IMPRESSION",
  title: "Wear the feeling.",
  title_emphasis: "Keep the memory.",
  description: "Discover luxury Eau de Parfum sprays and 100% pure concentrated fragrance oils, crafted with fine European extracts to leave an unforgettable trail.",
  cta_label: "Explore perfumes & fragrances",
  caption_one: "01 / PERFUMES & FRAGRANCE OILS",
  caption_two: "SCENT, MADE PERSONAL",
};
