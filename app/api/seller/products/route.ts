import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSeller } from "@/lib/supabase/seller-user";

const fields = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  category: z.string().trim().min(2).max(60),
  price: z.coerce.number().finite().min(1).max(1000000),
  compareAtPrice: z.number().finite().positive().max(1000000).nullable(),
  size: z.string().trim().min(1).max(40),
  concentration: z.string().trim().min(1).max(80),
  notes: z.string().trim().min(2).max(240),
  description: z.string().trim().min(10).max(1600),
  imageUrl: z.string().refine((value) => value === "" || (URL.canParse(value) && new URL(value).protocol === "https:")).max(2048),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  stock: z.coerce.number().int().min(0).max(100000),
  active: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.compareAtPrice !== null && value.compareAtPrice <= value.price) {
    context.addIssue({ code: "custom", path: ["compareAtPrice"], message: "The regular price must be higher than the selling price." });
  }
});

const productWithId = fields.extend({ id: z.string().uuid() }).strict();

function toClientProduct(item: Record<string, unknown>) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category,
    pricePaise: item.price_paise,
    compareAtPaise: item.compare_at_paise ?? undefined,
    size: item.size,
    concentration: item.concentration,
    notes: item.notes,
    description: item.description,
    imageUrl: item.image_url,
    accent: item.accent,
    stock: item.stock,
    featured: item.featured,
    active: item.active,
    createdAt: item.created_at,
  };
}

function validationMessage(value: z.infer<typeof fields>) {
  return {
    name: value.name,
    slug: value.slug,
    category: value.category,
    price_paise: Math.round(value.price * 100),
    compare_at_paise: value.compareAtPrice === null ? null : Math.round(value.compareAtPrice * 100),
    size: value.size,
    concentration: value.concentration,
    notes: value.notes.split(",").map((note) => note.trim()).filter(Boolean),
    description: value.description,
    image_url: value.imageUrl || null,
    accent: value.accent,
    stock: value.stock,
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
    if (!parsed.success) return NextResponse.json({ error: "Please check all perfume details." }, { status: 400 });
    const { data: category } = await seller.supabase.from("store_categories").select("name").eq("name", parsed.data.category).eq("active", true).maybeSingle();
    if (!category) return NextResponse.json({ error: "Choose an active store category." }, { status: 400 });

    const { data, error } = await seller.supabase.from("products").insert({
      ...validationMessage(parsed.data),
      seller_id: seller.user.id,
      featured: false,
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ product: toClientProduct(data) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("products_slug_key") ? "That product URL is already in use." : "Could not add this perfume.";
    console.error("Seller product creation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  try {
    const seller = await getActiveSeller();
    if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });
    const parsed = productWithId.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Please check all perfume details." }, { status: 400 });
    const { id, ...value } = parsed.data;
    const { data: category } = await seller.supabase.from("store_categories").select("name").eq("name", value.category).eq("active", true).maybeSingle();
    if (!category) return NextResponse.json({ error: "Choose an active store category." }, { status: 400 });

    const { data, error } = await seller.supabase.from("products").update({
      ...validationMessage(value),
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("seller_id", seller.user.id).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "That perfume is not in your catalogue." }, { status: 404 });
    return NextResponse.json({ product: toClientProduct(data) });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("products_slug_key") ? "That product URL is already in use." : "Could not update this perfume.";
    console.error("Seller product update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
