import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SellerDashboard from "@/components/seller-dashboard";
import SellerPortalLanding from "@/components/seller-portal-landing";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Flovexa Seller Central — Merchant & Partner Portal | Sell on Flovexa",
  description: "Official Flovexa Seller Hub. Become an authorized fragrance merchant partner, list luxury perfumes, manage inventory, and grow your fragrance business across India on Flovexa.",
  alternates: { canonical: canonicalUrl("/seller") },
  keywords: [
    "Flovexa seller",
    "Flovexa seller login",
    "Flovexa seller portal",
    "sell on Flovexa",
    "Flovexa merchant partner",
    "fragrance seller portal India",
    "perfume sellers marketplace",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Flovexa Seller Central — Merchant & Partner Portal",
    description: "Join Flovexa as an authorized fragrance merchant partner. Manage perfume listings and customer orders.",
    url: canonicalUrl("/seller"),
  },
};

import SellerApplicationPending from "@/components/seller-application-pending";

export default async function SellerPage() {
  const user = await getSignedInUser();
  if (!user) {
    return <SellerPortalLanding />;
  }

  const role = getStoreRole(user);
  if (role === "admin") {
    redirect("/admin");
  }

  const supabase = createAdminSupabase();

  // Check seller profile and owner approval status
  const { data: profile, error: profileError } = await supabase
    .from("seller_profiles")
    .select("store_name, status, admin_note, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  // 1. If seller has an application pending owner approval or suspended access
  if (profile && (profile.admin_note?.includes("PENDING_APPROVAL") || profile.status === "suspended")) {
    return (
      <SellerApplicationPending
        email={user.email ?? ""}
        storeName={profile.store_name || "Seller Store"}
        appliedDate={profile.created_at}
        isSuspended={profile.status === "suspended" && !profile.admin_note?.includes("PENDING_APPROVAL")}
      />
    );
  }

  // 2. If user is not an approved active seller, show the portal landing / application form
  if (role !== "seller" || !profile || profile.status !== "active") {
    return <SellerPortalLanding />;
  }

  const [{ data: productRows, error: productError }, { data: categoryRows, error: categoryError }] = await Promise.all([
    supabase.from("products").select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, stock, active, created_at").eq("seller_id", user.id).order("created_at", { ascending: false }),
    supabase.from("store_categories").select("name").eq("active", true).order("sort_order"),
  ]);
  if (productError || categoryError) throw productError ?? categoryError;

  const products = (productRows ?? []).map((item) => {
    let images: string[] = [];
    let primary = item.image_url ?? undefined;
    if (item.image_url) {
      const trimmed = item.image_url.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            primary = parsed[0];
            images = parsed.filter(Boolean);
          }
        } catch {}
      } else if (trimmed.includes(",")) {
        images = trimmed.split(",").map((s: string) => s.trim()).filter(Boolean);
        primary = images[0];
      } else {
        images = [trimmed];
      }
    }
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
      imageUrl: primary,
      images,
      accent: item.accent,
      stock: item.stock,
      active: item.active,
      createdAt: item.created_at,
    };
  });
  const categories = (categoryRows ?? []).map((item) => item.name);
  return <SellerDashboard storeName={profile.store_name || user.email || "Seller account"} initialProducts={products} categories={categories.length ? categories : ["Unisex"]}/>;
}
