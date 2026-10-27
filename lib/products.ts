export type ProductVariant = {
  id: string;
  sku?: string;
  size: string;
  pricePaise: number;
  compareAtPaise?: number;
  stock: number;
  imageUrl?: string;
  images?: string[];
};

export type Product = {
  id: string;
  sku?: string;
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
  salesCount?: number;
  variants?: ProductVariant[];
};

export const VARIANTS_TAG_PREFIX = "<!--FLOVEXA_VARIANTS:";
export const VARIANTS_TAG_SUFFIX = "-->";

export function generateDefaultSku(productName?: string, size?: string, index = 0): string {
  const namePart = (productName || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4) || "FLX";
  const sizePart = (size || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6) || `V${index + 1}`;
  return `FLX-${namePart}-${sizePart}`;
}

export function extractProductVariants(
  description: string,
  baseProduct?: {
    name?: string;
    sku?: string;
    size: string;
    pricePaise: number;
    compareAtPaise?: number;
    stock?: number;
    imageUrl?: string | null;
    images?: string[];
  }
): { cleanDescription: string; variants: ProductVariant[] } {
  if (!description) {
    return {
      cleanDescription: "",
      variants: baseProduct ? [{
        id: "var-default",
        sku: baseProduct.sku || generateDefaultSku(baseProduct.name, baseProduct.size, 0),
        size: baseProduct.size || "50 ml",
        pricePaise: baseProduct.pricePaise,
        compareAtPaise: baseProduct.compareAtPaise,
        stock: baseProduct.stock ?? 10,
        imageUrl: baseProduct.imageUrl || undefined,
        images: baseProduct.images || (baseProduct.imageUrl ? [baseProduct.imageUrl] : []),
      }] : [],
    };
  }

  const startIndex = description.indexOf(VARIANTS_TAG_PREFIX);
  const endIndex = description.indexOf(VARIANTS_TAG_SUFFIX, startIndex);
  let variants: ProductVariant[] = [];
  let cleanDescription = description;

  if (startIndex !== -1 && endIndex !== -1) {
    const rawJson = description.substring(startIndex + VARIANTS_TAG_PREFIX.length, endIndex);
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out legacy dummy mock variants (e.g. 20ml/10ml dummy presets from earlier dev)
        const validItems = parsed.filter((item) => {
          const s = String(item?.size || "").trim().toLowerCase();
          const p = Number(item?.pricePaise || 0) || Math.round(Number(item?.price || 0) * 100);
          if (["20 ml", "10 ml"].includes(s) && (p === 29900 || p === 14900)) {
            return false;
          }
          return true;
        });

        variants = validItems.map((item, idx) => {
          const sizeStr = String(item.size || "").trim();
          const skuVal = item.sku ? String(item.sku).trim().toUpperCase() : generateDefaultSku(baseProduct?.name, sizeStr, idx);
          return {
            id: item.id || `var-${idx + 1}`,
            sku: skuVal,
            size: sizeStr,
            pricePaise: Number(item.pricePaise) || Math.round(Number(item.price || 0) * 100),
            compareAtPaise: item.compareAtPaise ? Number(item.compareAtPaise) : item.compareAtPrice ? Math.round(Number(item.compareAtPrice) * 100) : undefined,
            stock: Number(item.stock ?? 10),
            imageUrl: item.imageUrl || undefined,
            images: Array.isArray(item.images) ? item.images : item.imageUrl ? [item.imageUrl] : [],
          };
        });
      }
      cleanDescription = (description.substring(0, startIndex) + description.substring(endIndex + VARIANTS_TAG_SUFFIX.length)).trim();
    } catch {
      // Ignored if JSON parsing fails
    }
  }

  // If no variants were explicitly found in description, build default single variant
  if (variants.length === 0 && baseProduct) {
    variants = [{
      id: "var-default",
      sku: baseProduct.sku || generateDefaultSku(baseProduct.name, baseProduct.size, 0),
      size: baseProduct.size || "50 ml",
      pricePaise: baseProduct.pricePaise,
      compareAtPaise: baseProduct.compareAtPaise,
      stock: baseProduct.stock ?? 10,
      imageUrl: baseProduct.imageUrl || undefined,
      images: baseProduct.images || (baseProduct.imageUrl ? [baseProduct.imageUrl] : []),
    }];
  }

  return { cleanDescription, variants };
}

export function attachVariantsToDescription(description: string, variants: ProductVariant[]): string {
  const rawDesc = description || "";
  const startIndex = rawDesc.indexOf(VARIANTS_TAG_PREFIX);
  const endIndex = rawDesc.indexOf(VARIANTS_TAG_SUFFIX, startIndex);
  let clean = rawDesc;
  if (startIndex !== -1 && endIndex !== -1) {
    clean = (rawDesc.substring(0, startIndex) + rawDesc.substring(endIndex + VARIANTS_TAG_SUFFIX.length)).trim();
  } else {
    clean = rawDesc.trim();
  }

  if (!variants || variants.length === 0) return clean;
  return `${clean}\n\n${VARIANTS_TAG_PREFIX}${JSON.stringify(variants)}${VARIANTS_TAG_SUFFIX}`;
}

// Flovexa catalogue: Live products are retrieved from the database.
export const sampleProducts: Product[] = [];
