import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSeller } from "@/lib/supabase/seller-user";
import { extractProductVariants, attachVariantsToDescription, generateDefaultSku, type ProductVariant } from "@/lib/products";

const variantItemSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().max(60).optional().nullable(),
  size: z.string().trim().min(1).max(40),
  price: z.coerce.number().finite().min(1).max(1000000),
  compareAtPrice: z.coerce.number().finite().positive().max(1000000).optional().nullable(),
  stock: z.coerce.number().int().min(0).max(100000).default(10),
  imageUrl: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
});

const fields = z.object({
  name: z.string().trim().min(2, "Perfume name must be at least 2 characters.").max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "URL slug must be lowercase alphanumeric and hyphens only.").max(140),
  category: z.string().trim().min(1, "Please choose a category.").max(60),
  price: z.coerce.number().finite().min(1).max(1000000).optional(),
  compareAtPrice: z.coerce.number().finite().positive().max(1000000).nullable().optional(),
  sku: z.string().trim().max(60).optional().nullable(),
  size: z.string().trim().min(1).max(40).optional(),
  concentration: z.string().trim().min(1, "Concentration is required.").max(80),
  notes: z.string().trim().min(2, "Fragrance notes are required.").max(500),
  description: z.string().trim().min(5, "Description must be at least 5 characters.").max(32000),
  imageUrl: z.string().max(32000).optional(),
  images: z.array(z.string()).optional(),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i, "Invalid accent color code."),
  stock: z.coerce.number().int().min(0).max(100000).optional(),
  active: z.boolean(),
  variants: z.array(variantItemSchema).optional(),
}).strict().superRefine((value, context) => {
  if (value.compareAtPrice !== null && value.compareAtPrice !== undefined && value.price !== undefined && value.compareAtPrice <= value.price) {
    context.addIssue({ code: "custom", path: ["compareAtPrice"], message: "The regular price must be higher than the selling price." });
  }
});

const productWithId = fields.extend({ id: z.string().uuid() }).strict();

function parseStoredImages(imageUrl: unknown): { primary: string | undefined; images: string[] } {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
    return { primary: undefined, images: [] };
  }
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { primary: parsed[0] || undefined, images: parsed.filter(Boolean) };
      }
    } catch {}
  }
  if (trimmed.includes(",")) {
    const list = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length > 0) return { primary: list[0], images: list };
  }
  return { primary: trimmed, images: [trimmed] };
}

function toClientProduct(item: Record<string, unknown>) {
  const { primary, images } = parseStoredImages(item.image_url);
  const { cleanDescription, variants } = extractProductVariants(String(item.description || ""), {
    name: String(item.name || ""),
    size: String(item.size || "50 ml"),
    pricePaise: Number(item.price_paise || 0),
    compareAtPaise: item.compare_at_paise ? Number(item.compare_at_paise) : undefined,
    stock: Number(item.stock || 0),
    imageUrl: primary,
    images,
  });

  const mainSku = variants[0]?.sku || generateDefaultSku(String(item.name || ""), String(item.size || "50 ml"), 0);

  return {
    id: item.id,
    sku: mainSku,
    slug: item.slug,
    name: item.name,
    category: item.category,
    pricePaise: item.price_paise,
    compareAtPaise: item.compare_at_paise ?? undefined,
    size: item.size,
    concentration: item.concentration,
    notes: item.notes,
    description: cleanDescription,
    imageUrl: primary,
    images,
    accent: item.accent,
    stock: item.stock,
    featured: item.featured,
    active: item.active,
    createdAt: item.created_at,
    variants,
  };
}

function validationMessage(value: z.infer<typeof fields>) {
  const allImages = Array.isArray(value.images) && value.images.length > 0
    ? value.images.filter(Boolean)
    : value.imageUrl
    ? value.imageUrl.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let basePricePaise = value.price ? Math.round(value.price * 100) : 49900;
  let baseCompareAtPaise = value.compareAtPrice ? Math.round(value.compareAtPrice * 100) : null;
  let baseSize = value.size || "50 ml";
  let baseStock = value.stock ?? 10;
  let finalDescription = value.description;

  if (value.variants && value.variants.length > 0) {
    const formattedVariants: ProductVariant[] = value.variants.map((v, i) => {
      const cleanSku = v.sku?.trim().toUpperCase() || generateDefaultSku(value.name, v.size, i);
      return {
        id: v.id || `var-${Date.now()}-${i + 1}`,
        sku: cleanSku,
        size: v.size.trim(),
        pricePaise: Math.round(v.price * 100),
        compareAtPaise: v.compareAtPrice ? Math.round(v.compareAtPrice * 100) : undefined,
        stock: v.stock,
        imageUrl: v.imageUrl || undefined,
        images: v.images || (v.imageUrl ? [v.imageUrl] : []),
      };
    });

    const primaryVariant = formattedVariants[0];
    basePricePaise = primaryVariant.pricePaise;
    baseCompareAtPaise = primaryVariant.compareAtPaise ?? null;
    baseSize = primaryVariant.size;
    baseStock = formattedVariants.reduce((sum, v) => sum + v.stock, 0);
    finalDescription = attachVariantsToDescription(value.description, formattedVariants);

    // Merge any variant images into product photos
    const variantImgs = formattedVariants.map((v) => v.imageUrl).filter(Boolean) as string[];
    variantImgs.forEach((img) => {
      if (!allImages.includes(img)) allImages.push(img);
    });
  }

  const storedImageUrl = allImages.length > 1
    ? JSON.stringify(allImages)
    : allImages.length === 1
    ? allImages[0]
    : null;

  return {
    name: value.name,
    slug: value.slug,
    category: value.category,
    price_paise: basePricePaise,
    compare_at_paise: baseCompareAtPaise,
    size: baseSize,
    concentration: value.concentration,
    notes: value.notes.split(",").map((note) => note.trim()).filter(Boolean),
    description: finalDescription,
    image_url: storedImageUrl,
    accent: value.accent,
    stock: baseStock,
    active: value.active,
  };
}

export async function GET() {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });
    const { data, error } = await seller.supabase.from("products").select("*").eq("seller_id", seller.user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ products: (data ?? []).map((item) => toClientProduct(item)) });
  } catch (error) {
    console.error("Seller products could not be loaded", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not load your products." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });

    const parsed = fields.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Please check all perfume details.";
      return NextResponse.json({ error: issue }, { status: 400 });
    }

    const insertPayload = {
      ...validationMessage(parsed.data),
      seller_id: seller.user.id,
      featured: false,
    };

    let { data, error } = await seller.supabase.from("products").insert(insertPayload).select("*").single();

    if (error && (error.message?.includes("products_slug_key") || error.code === "23505")) {
      const suffix = Math.random().toString(36).substring(2, 6);
      insertPayload.slug = `${parsed.data.slug}-${suffix}`;
      const retry = await seller.supabase.from("products").insert(insertPayload).select("*").single();
      data = retry.data;
      error = retry.error;
    }

    if (error && (error.code === "PGRST205" || error.message?.includes("schema cache"))) {
      // Graceful retry after a brief pause in case of temporary schema cache reload
      await new Promise((resolve) => setTimeout(resolve, 500));
      const retry = await seller.supabase.from("products").insert(insertPayload).select("*").single();
      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) {
      console.error("[products/POST] Database insert error:", error);
      throw new Error(error.message || "Database insert failed.");
    }

    return NextResponse.json({ product: toClientProduct(data) }, { status: 201 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Could not add this perfume.";
    let message = rawMessage;
    if (rawMessage.includes("products_slug_key")) {
      message = "That perfume URL slug is already in use. Please choose a different name or slug.";
    } else if (rawMessage.includes("schema cache") || rawMessage.includes("PGRST205")) {
      message = "Supabase database schema cache is currently refreshing. Please try again in a few seconds.";
    }
    console.error("Seller product creation failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const quickStockSchema = z.object({ id: z.string().uuid(), stock: z.coerce.number().int().min(0).max(100000) }).strict();
const quickActiveSchema = z.object({ id: z.string().uuid(), active: z.boolean() }).strict();

export async function PATCH(request: Request) {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });
    const raw = await request.json().catch(() => null);

    // 1. Quick stock update
    const quickStock = quickStockSchema.safeParse(raw);
    if (quickStock.success) {
      let { data, error } = await seller.supabase.from("products").update({
        stock: quickStock.data.stock,
        updated_at: new Date().toISOString(),
      }).eq("id", quickStock.data.id).eq("seller_id", seller.user.id).select("*").maybeSingle();

      if (error && (error.code === "PGRST205" || error.message?.includes("schema cache"))) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retry = await seller.supabase.from("products").update({
          stock: quickStock.data.stock,
          updated_at: new Date().toISOString(),
        }).eq("id", quickStock.data.id).eq("seller_id", seller.user.id).select("*").maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      return NextResponse.json({ product: toClientProduct(data) });
    }

    // 2. Quick visibility toggle
    const quickActive = quickActiveSchema.safeParse(raw);
    if (quickActive.success) {
      let { data, error } = await seller.supabase.from("products").update({
        active: quickActive.data.active,
        updated_at: new Date().toISOString(),
      }).eq("id", quickActive.data.id).eq("seller_id", seller.user.id).select("*").maybeSingle();

      if (error && (error.code === "PGRST205" || error.message?.includes("schema cache"))) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retry = await seller.supabase.from("products").update({
          active: quickActive.data.active,
          updated_at: new Date().toISOString(),
        }).eq("id", quickActive.data.id).eq("seller_id", seller.user.id).select("*").maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      return NextResponse.json({ product: toClientProduct(data) });
    }

    // 3. Full product update
    const parsed = productWithId.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Please check all perfume details.";
      return NextResponse.json({ error: issue }, { status: 400 });
    }
    const { id, ...value } = parsed.data;

    let { data, error } = await seller.supabase.from("products").update({
      ...validationMessage(value),
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("seller_id", seller.user.id).select("*").maybeSingle();

    if (error && (error.code === "PGRST205" || error.message?.includes("schema cache"))) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const retry = await seller.supabase.from("products").update({
        ...validationMessage(value),
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("seller_id", seller.user.id).select("*").maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "That perfume is not in your catalogue." }, { status: 404 });
    return NextResponse.json({ product: toClientProduct(data) });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Could not update this perfume.";
    let message = rawMessage;
    if (rawMessage.includes("products_slug_key")) {
      message = "That perfume URL slug is already in use.";
    } else if (rawMessage.includes("schema cache") || rawMessage.includes("PGRST205")) {
      message = "Supabase database schema cache is currently refreshing. Please try again in a few seconds.";
    }
    console.error("Seller product update failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });

    const raw = await request.json().catch(() => null);
    const id = typeof raw?.id === "string" ? raw.id : null;
    if (!id) return NextResponse.json({ error: "Product ID is required." }, { status: 400 });

    const { error } = await seller.supabase.from("products").delete().eq("id", id).eq("seller_id", seller.user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Seller product delete failed:", error);
    return NextResponse.json({ error: "Could not delete this perfume." }, { status: 400 });
  }
}
