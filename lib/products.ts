export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  pricePaise: number;
  compareAtPaise?: number;
  size: string;
  concentration: string;
  notes: string[];
  description: string;
  imageUrl: string | null;
  accent: string;
  featured: boolean;
  active: boolean;
};

// Temporary catalogue for local development. Replace with real product data in Supabase before launch.
export const sampleProducts: Product[] = [
  { id: "demo-1", slug: "saffron-veil", name: "Saffron Veil", category: "For Her", pricePaise: 329900, size: "50 ml", concentration: "Eau de Parfum", notes: ["Saffron", "Damask rose", "White musk"], description: "A luminous floral fragrance that opens with golden saffron and settles into a soft, elegant trail of rose and white musk.", imageUrl: null, accent: "#ad7045", featured: true, active: true },
  { id: "demo-2", slug: "midnight-oud", name: "Midnight Oud", category: "For Him", pricePaise: 429900, size: "50 ml", concentration: "Eau de Parfum", notes: ["Black pepper", "Oud", "Amber"], description: "Smoky oud and cracked black pepper meet warm amber and aged woods for a deep, memorable signature.", imageUrl: null, accent: "#75462f", featured: true, active: true },
  { id: "demo-3", slug: "fig-and-santal", name: "Fig & Santal", category: "Unisex", pricePaise: 289900, size: "50 ml", concentration: "Eau de Parfum", notes: ["Fig leaf", "Sandalwood", "Cedar"], description: "Green fig leaves soften into creamy sandalwood and quiet cedar. Skin-close, warm and easy to wear.", imageUrl: null, accent: "#a99570", featured: true, active: true },
  { id: "demo-4", slug: "rose-de-minuit", name: "Rose de Minuit", category: "For Her", pricePaise: 359900, size: "50 ml", concentration: "Eau de Parfum", notes: ["Pink pepper", "Rose", "Patchouli"], description: "Velvety rose, a glimmer of pink pepper and a gently resinous base composed for long evenings.", imageUrl: null, accent: "#99555a", featured: true, active: true },
  { id: "demo-5", slug: "cedar-no-08", name: "Cedar No. 08", category: "For Him", pricePaise: 319900, size: "50 ml", concentration: "Eau de Parfum", notes: ["Bergamot", "Vetiver", "Cedarwood"], description: "Bright bergamot meets aromatic vetiver and dry cedar, like a forest just after the rain.", imageUrl: null, accent: "#697051", featured: false, active: true },
  { id: "demo-6", slug: "vanille-brulee", name: "Vanille Brûlée", category: "Unisex", pricePaise: 339900, size: "50 ml", concentration: "Eau de Parfum", notes: ["Madagascar vanilla", "Tonka", "Smoked sugar"], description: "A generous vanilla warmed with toasted tonka and a fine thread of smoke. Comfort with a little edge.", imageUrl: null, accent: "#b68b56", featured: false, active: true },
  { id: "demo-7", slug: "amber-alchemy", name: "Amber Alchemy", category: "Oud & Attar", pricePaise: 249900, size: "12 ml", concentration: "Perfume Oil", notes: ["Saffron", "Golden amber", "Oud"], description: "A concentrated, alcohol-free perfume oil with golden amber, saffron and a velvety oud accord.", imageUrl: null, accent: "#bc7337", featured: true, active: true },
  { id: "demo-8", slug: "the-discovery-set", name: "The Discovery Set", category: "Discovery Sets", pricePaise: 119900, size: "6 × 2 ml", concentration: "Six signature scents", notes: ["Six fragrances", "Travel size", "Find your favourite"], description: "Explore six of our signature fragrances in generous 2 ml vials before choosing your full-size bottle.", imageUrl: null, accent: "#94754f", featured: true, active: true },
];
