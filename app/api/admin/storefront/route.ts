import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

const settingsSchema = z.object({
  hero_image_url: z.string().trim().max(2048).refine((value) => value === "" || (URL.canParse(value) && new URL(value).protocol === "https:")),
  announcement: z.string().trim().min(1).max(120), eyebrow: z.string().trim().min(1).max(100), title: z.string().trim().min(1).max(80),
  title_emphasis: z.string().trim().min(1).max(80), description: z.string().trim().min(20).max(360), cta_label: z.string().trim().min(1).max(50),
  caption_one: z.string().trim().min(1).max(100), caption_two: z.string().trim().min(1).max(100),
}).strict();

export async function PATCH(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the homepage text and character limits." }, { status: 400 });
  try {
    const { data, error } = await createAdminSupabase().from("storefront_settings").upsert({ id: "home", ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("hero_image_url, announcement, eyebrow, title, title_emphasis, description, cta_label, caption_one, caption_two").single();
    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("Homepage settings update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not save homepage content. Apply the latest storefront migration and try again." }, { status: 503 });
  }
}

const categorySchema = z.object({ name: z.string().trim().min(2).max(60) }).strict();
export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const parsed = categorySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Category names must be 2–60 characters." }, { status: 400 });
  try {
    const supabase = createAdminSupabase();
    const { data: last } = await supabase.from("store_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase.from("store_categories").insert({ name: parsed.data.name, sort_order: (last?.sort_order ?? 0) + 10, active: true }).select("name, sort_order, active").single();
    if (error?.code === "23505") return NextResponse.json({ error: "That category already exists." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    console.error("Store category creation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not add this category." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });
  const parsed = categorySchema.safeParse({ name: new URL(request.url).searchParams.get("name") });
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  try {
    const supabase = createAdminSupabase();
    const { count: categoryCount, error: categoryCountError } = await supabase.from("store_categories").select("name", { count: "exact", head: true });
    if (categoryCountError) throw categoryCountError;
    if ((categoryCount ?? 0) <= 1) return NextResponse.json({ error: "Keep at least one active category on the storefront." }, { status: 409 });
    const { count, error: countError } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category", parsed.data.name);
    if (countError) throw countError;
    if ((count ?? 0) > 0) return NextResponse.json({ error: "Move or remove this category’s products before deleting it." }, { status: 409 });
    const { error } = await supabase.from("store_categories").delete().eq("name", parsed.data.name);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Store category deletion failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not remove this category." }, { status: 503 });
  }
}
