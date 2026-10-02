import { redirect } from "next/navigation";
import SellerDashboard from "@/components/seller-dashboard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";

export default async function SellerPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login?next=seller");
  const role = getStoreRole(user);
  if (role !== "seller") redirect(role === "admin" ? "/admin" : "/account");

  const supabase = createAdminSupabase();
  const [{ data: profile, error: profileError }, { data: productRows, error: productError }, { data: categoryRows, error: categoryError }] = await Promise.all([
    supabase.from("seller_profiles").select("store_name, status").eq("user_id", user.id).maybeSingle(),
    supabase.from("products").select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, stock, active, created_at").eq("seller_id", user.id).order("created_at", { ascending: false }),
    supabase.from("store_categories").select("name").eq("active", true).order("sort_order"),
  ]);
  if (profileError || productError || categoryError) throw profileError ?? productError ?? categoryError;
  if (!profile || profile.status !== "active") redirect("/account");

  const products = (productRows ?? []).map((item) => ({
    id: item.id, slug: item.slug, name: item.name, category: item.category,
    pricePaise: item.price_paise, compareAtPaise: item.compare_at_paise ?? undefined,
    size: item.size, concentration: item.concentration, notes: item.notes, description: item.description,
    imageUrl: item.image_url ?? undefined, accent: item.accent, stock: item.stock,
    active: item.active, createdAt: item.created_at,
  }));
  const categories = (categoryRows ?? []).map((item) => item.name);
  return <SellerDashboard storeName={profile.store_name || user.email || "Seller account"} initialProducts={products} categories={categories.length ? categories : ["Unisex"]}/>;
}
