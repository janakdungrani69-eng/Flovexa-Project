import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  category: z.enum(["For Her", "For Him", "Unisex", "Oud & Attar", "Discovery Sets"]),
  price: z.coerce.number().finite().min(1).max(1000000),
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

function toClientProduct(item: Record<string, unknown>) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category,
    pricePaise: item.price_paise,
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
    const { data, error } = await supabase.from("products").insert({
      name: value.name, slug: value.slug, category: value.category,
      price_paise: Math.round(value.price * 100), size: value.size,
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
  const parsed = productSchema.extend({ id: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Please check all fragrance details." }, { status: 400 });
  const { id, ...value } = parsed.data;
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.from("products").update({
      name: value.name, slug: value.slug, category: value.category,
      price_paise: Math.round(value.price * 100), size: value.size,
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
