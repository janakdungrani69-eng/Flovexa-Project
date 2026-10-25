import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SellerDashboard from "@/components/seller-dashboard";
import SellerPortalLanding from "@/components/seller-portal-landing";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";
import { canonicalUrl } from "@/lib/seo";
import { extractProductVariants } from "@/lib/products";
import SellerApplicationPending from "@/components/seller-application-pending";

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

export default async function SellerPage() {
  const user = await getSignedInUser();
  if (!user) {
    return <SellerPortalLanding />;
  }

  const role = getStoreRole(user);
  const isMasterAdmin =
    role === "admin" ||
    user.email?.trim().toLowerCase() === "janakdungrani69@gmail.com";

  let profile: {
    store_name?: string;
    status?: string;
    admin_note?: string;
    created_at?: string;
  } | null = null;

  let productRows: any[] = [];
  let categoryRows: any[] = [];

  try {
    const supabase = createAdminSupabase();

    // Check seller profile and owner approval status
    const { data: profileData, error: profileError } = await supabase
      .from("seller_profiles")
      .select("store_name, status, admin_note, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[SellerPage] Notice: Could not read seller_profile row:", profileError);
    } else {
      profile = profileData;
    }

    // 1. If seller has an application pending owner approval or suspended access
    if (!isMasterAdmin && profile && (profile.admin_note?.includes("PENDING_APPROVAL") || profile.status === "suspended")) {
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
    if (!isMasterAdmin && role !== "seller" && (!profile || profile.status !== "active")) {
      return <SellerPortalLanding />;
    }

    const productQuery = isMasterAdmin
      ? supabase
          .from("products")
          .select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, stock, active, created_at")
          .order("created_at", { ascending: false })
      : supabase
          .from("products")
          .select("id, slug, name, category, price_paise, compare_at_paise, size, concentration, notes, description, image_url, accent, stock, active, created_at")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

    const [{ data: products, error: productError }, { data: categories, error: categoryError }] = await Promise.all([
      productQuery,
      supabase
        .from("store_categories")
        .select("name")
        .eq("active", true)
        .order("sort_order"),
    ]);

    if (productError) {
      console.error("[SellerPage] Notice: Could not load products:", productError);
    } else if (products) {
      productRows = products;
    }

    if (categoryError) {
      console.error("[SellerPage] Notice: Could not load categories:", categoryError);
    } else if (categories) {
      categoryRows = categories;
    }
  } catch (catchErr) {
    console.error("[SellerPage] Handled server error:", catchErr);
    if (!isMasterAdmin && role !== "seller") {
      return <SellerPortalLanding />;
    }
  }

  const products = productRows.map((item) => {
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
    const { cleanDescription, variants } = extractProductVariants(String(item.description || ""), {
      name: item.name,
      size: item.size,
      pricePaise: item.price_paise,
      compareAtPaise: item.compare_at_paise ?? undefined,
      stock: item.stock,
      imageUrl: primary,
      images,
    });

    return {
      id: item.id,
      sku: variants[0]?.sku,
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
      active: item.active,
      createdAt: item.created_at,
      variants,
    };
  });

  const categories = categoryRows.map((item) => item.name);
  const storeName = profile?.store_name || (user.user_metadata?.store_name as string) || (user.email ? user.email.split("@")[0] : "FLOVEXA");

  return (
    <SellerDashboard
      storeName={storeName}
      initialProducts={products}
      categories={categories.length ? categories : ["Unisex", "Men", "Women"]}
    />
  );
}
