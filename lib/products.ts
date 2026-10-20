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
  images?: string[];
  accent: string;
  featured: boolean;
  active: boolean;
  stock?: number;
};

// Flovexa catalogue: Luxury Perfumes & Fragrances (8 Signature Creations)
export const sampleProducts: Product[] = [
  {
    id: "prod-chocolate-desire",
    slug: "chocolate-desire",
    name: "Chocolate Desire",
    category: "Perfume",
    pricePaise: 349900,
    compareAtPaise: 499900,
    size: "100 ml",
    concentration: "Eau de Parfum",
    notes: ["Warm Spicy Chocolate", "Dark Cocoa", "Madagascar Vanilla"],
    description: "An indulgent, seductive Eau de Parfum celebrating the rich decadence of roasted cocoa, dark chocolate, and creamy vanilla spiced with warm cinnamon.",
    imageUrl: "/products/chocolate-desire.jpg",
    accent: "#5c3826",
    featured: true,
    active: true,
  },
  {
    id: "prod-aqua-blue",
    slug: "aqua-blue",
    name: "Aqua Blue",
    category: "Fragrance",
    pricePaise: 219900,
    compareAtPaise: 299900,
    size: "30 ml",
    concentration: "Fragrance Oil",
    notes: ["Ocean Breeze", "Aquatic Splash", "Fresh Citrus", "Clean Amber"],
    description: "A high-potency concentrated fragrance oil with refreshing ocean spray, marine freshness, and crisp citrus notes in a luxury dropper bottle.",
    imageUrl: "/products/aqua-blue.jpg",
    accent: "#1e6091",
    featured: false,
    active: true,
  },
  {
    id: "prod-saffron-veil",
    slug: "saffron-veil",
    name: "Saffron Veil",
    category: "Perfume",
    pricePaise: 329900,
    compareAtPaise: 429900,
    size: "50 ml",
    concentration: "Eau de Parfum",
    notes: ["Kashmiri Saffron", "Damask Rose", "Golden Amber", "White Musk"],
    description: "A luminous floral fragrance that opens with golden saffron and settles into a soft, elegant trail of rose and white musk.",
    imageUrl: "/products/saffron-veil.jpg",
    accent: "#ad7045",
    featured: false,
    active: true,
  },
  {
    id: "prod-midnight-oud",
    slug: "midnight-oud",
    name: "Midnight Oud",
    category: "Perfume",
    pricePaise: 429900,
    compareAtPaise: 549900,
    size: "50 ml",
    concentration: "Eau de Parfum",
    notes: ["Smoked Agarwood", "Black Pepper", "Aged Leather", "Warm Amber"],
    description: "Smoky oud and cracked black pepper meet warm amber and aged woods for a deep, memorable signature.",
    imageUrl: "/products/midnight-oud.jpg",
    accent: "#75462f",
    featured: false,
    active: true,
  },
  {
    id: "prod-amber-alchemy",
    slug: "amber-alchemy",
    name: "Amber Alchemy",
    category: "Fragrance",
    pricePaise: 249900,
    compareAtPaise: 319900,
    size: "12 ml",
    concentration: "Fragrance Oil",
    notes: ["Golden Amber", "Saffron Threads", "Warm Vanilla", "Velvet Oud"],
    description: "A concentrated, alcohol-free fragrance oil with golden amber, saffron and a velvety oud accord.",
    imageUrl: "/products/amber-alchemy.jpg",
    accent: "#bc7337",
    featured: false,
    active: true,
  },
  {
    id: "prod-imperial-santal",
    slug: "imperial-santal",
    name: "Imperial Santal",
    category: "Perfume",
    pricePaise: 319900,
    compareAtPaise: 419900,
    size: "50 ml",
    concentration: "Eau de Parfum",
    notes: ["Mysore Sandalwood", "Cardamom Spice", "Creamy Cedar", "White Amber"],
    description: "A tribute to royal Indian sandalwood, wrapped in dry exotic spices and warm creamy woods for a distinguished presence.",
    imageUrl: "/products/imperial-santal.jpg",
    accent: "#8c6b43",
    featured: false,
    active: true,
  },
  {
    id: "prod-rose-royale",
    slug: "rose-royale",
    name: "Rose Royale",
    category: "Perfume",
    pricePaise: 289900,
    compareAtPaise: 389900,
    size: "50 ml",
    concentration: "Eau de Parfum",
    notes: ["Damask Rose", "Pink Pepper", "Cashmere Wood", "Sweet Patchouli"],
    description: "Velvety morning-picked roses kissed by gentle pink pepper and wrapped in soft cashmere woods for memorable evenings.",
    imageUrl: "/products/rose-royale.jpg",
    accent: "#94565c",
    featured: false,
    active: true,
  },
  {
    id: "prod-musk-blanc",
    slug: "musk-blanc",
    name: "Musk Blanc",
    category: "Fragrance",
    pricePaise: 199900,
    compareAtPaise: 269900,
    size: "12 ml",
    concentration: "Fragrance Oil",
    notes: ["White Musk", "Lily of the Valley", "Soft Vanilla", "Clean Linen"],
    description: "An ethereal, second-skin concentrated fragrance oil with pristine white musk and gentle white florals that lingers intimately.",
    imageUrl: "/products/musk-blanc.jpg",
    accent: "#d5c8b5",
    featured: false,
    active: true,
  },
];
