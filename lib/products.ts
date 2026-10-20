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

// Flovexa catalogue: Live products are retrieved from the database.
export const sampleProducts: Product[] = [];
