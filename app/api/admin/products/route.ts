import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

const productFields = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  category: z.string().trim().min(2).max(60),
  price: z.coerce.number().finite().min(1).max(1000000),
  compareAtPrice: z.number().finite().positive().max(1000000).nullable(),
  size: z.string().trim().min(1).max(40),
  concentration: z.string().trim().min(1).max(80),
  notes: z.string().trim().min(2).max(240),
  description: z.string().trim().min(10).max(1600),
  imageUrl: z.string().refine((value) => value === "" || URL.canParse(value)).max(2048),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  stock: z.coerce.number().int().min(0).max(100000),
  featured: z.boolean(),
  active: z.boolean(),
}).strict();

const productSchema = productFields.superRefine((value, context) => {
  if (value.compareAtPrice !== null && value.compareAtPrice <= value.price) {
    context.addIssue({ code: "custom", path: ["compareAtPrice"], message: "The regular price must be higher than the selling price." });
  }
});

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

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Please check all fragrance details." }, { status: 400 });
  const value = parsed.data;
  try {
    const supabase = createAdminSupabase();
    const { data: category } = await supabase.from("store_categories").select("name").eq("name", value.category).eq("active", true).maybeSingle();
    if (!category) return NextResponse.json({ error: "Choose an active store category." }, { status: 400 });
    const { data, error } = await supabase.from("products").insert({
      name: value.name, slug: value.slug, category: value.category,
      price_paise: Math.round(value.price * 100), compare_at_paise: value.compareAtPrice === null ? null : Math.round(value.compareAtPrice * 100), size: value.size,
      concentration: value.concentration, notes: value.notes.split(",").map((note) => note.trim()).filter(Boolean),
      description: value.description, image_url: value.imageUrl || null, accent: value.accent,
      stock: value.stock, featured: value.featured, active: value.active,
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ product: toClientProduct(data) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("products_slug_key") ? "That product URL slug is already in use." : "Could not create this fragrance.";
    console.error("Product creation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const parsed = productFields.extend({ id: z.string().uuid() }).strict().superRefine((value, context) => {
    if (value.compareAtPrice !== null && value.compareAtPrice <= value.price) {
      context.addIssue({ code: "custom", path: ["compareAtPrice"], message: "The regular price must be higher than the selling price." });
    }
  }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Please check all fragrance details." }, { status: 400 });
  const { id, ...value } = parsed.data;
  try {
    const supabase = createAdminSupabase();
    const { data: category } = await supabase.from("store_categories").select("name").eq("name", value.category).eq("active", true).maybeSingle();
    if (!category) return NextResponse.json({ error: "Choose an active store category." }, { status: 400 });
    const { data, error } = await supabase.from("products").update({
      name: value.name, slug: value.slug, category: value.category,
      price_paise: Math.round(value.price * 100), compare_at_paise: value.compareAtPrice === null ? null : Math.round(value.compareAtPrice * 100), size: value.size,
      concentration: value.concentration, notes: value.notes.split(",").map((note) => note.trim()).filter(Boolean),
      description: value.description, image_url: value.imageUrl || null, accent: value.accent,
      stock: value.stock, featured: value.featured, active: value.active, updated_at: new Date().toISOString(),
    }).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ product: toClientProduct(data) });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("products_slug_key") ? "That product URL slug is already in use." : "Could not update this fragrance.";
    console.error("Product update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string().uuid() }).strict().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid perfume to delete." }, { status: 400 });

  try {
    const supabase = createAdminSupabase();
    const { data: result, error } = await supabase.rpc("admin_delete_product_if_unused", { product_uuid: parsed.data.id });
    if (error) throw error;
    if (result === "not_found") return NextResponse.json({ error: "This perfume no longer exists." }, { status: 404 });
    if (result === "has_orders") return NextResponse.json({ error: "This perfume has order history and cannot be deleted. Hide it from the storefront instead." }, { status: 409 });
    if (result !== "deleted") throw new Error("Unexpected product deletion result.");
    return NextResponse.json({ deletedId: parsed.data.id });
  } catch (error) {
    console.error("Product deletion failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not delete this perfume." }, { status: 500 });
  }
}
