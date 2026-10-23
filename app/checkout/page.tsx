import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutExperience from "@/components/checkout-experience";
import CheckoutBackButton from "@/components/checkout-back-button";
import { getProducts } from "@/lib/catalog";
import { calculateOrderPricing, getPricingConfig } from "@/lib/pricing";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Checkout");

type CartLine = { productId: string; quantity: number; variantId?: string; size?: string };
function parseCart(value?: string): CartLine[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((line: any): CartLine[] => {
      if (!line || typeof line.productId !== "string" || !Number.isInteger(line.quantity)) return [];
      return [{
        productId: line.productId,
        quantity: Math.max(1, Math.min(20, line.quantity)),
        variantId: typeof line.variantId === "string" ? line.variantId : undefined,
        size: typeof line.size === "string" ? line.size : undefined,
      }];
    }).slice(0, 20);
  } catch { return []; }
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ items?: string }> }) {
  const [{ items }, products, user] = await Promise.all([searchParams, getProducts(), getSignedInUser()]);
  if (!user) {
    const checkoutNext = items ? `/checkout?items=${encodeURIComponent(items)}` : "/checkout";
    redirect(`/login?next=${encodeURIComponent(checkoutNext)}`);
  }

  const requested = parseCart(items);
  const lines = requested.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return [];
    const variant = product.variants?.find((v) => (item.variantId && v.id === item.variantId) || (item.size && v.size.toLowerCase() === item.size.toLowerCase()));
    const resolvedProduct = variant ? {
      ...product,
      size: variant.size,
      pricePaise: variant.pricePaise,
      compareAtPaise: variant.compareAtPaise ?? product.compareAtPaise,
      imageUrl: variant.imageUrl || product.imageUrl,
    } : product;
    return [{ product: resolvedProduct, quantity: item.quantity }];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.pricePaise * line.quantity, 0);
  const pricingConfig = getPricingConfig();
  const pricing = pricingConfig ? calculateOrderPricing(subtotal, pricingConfig) : null;
  const hasRealProductIds = lines.length > 0 && lines.every((line) => !line.product.id.startsWith("demo-"));
  const paymentKeyIsLive = process.env.NODE_ENV !== "production" || process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_");
  const serverConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RESEND_API_KEY && process.env.ORDER_FROM_EMAIL &&
    process.env.ORDER_LOOKUP_PEPPER && process.env.NEXT_PUBLIC_SITE_URL && pricingConfig && paymentKeyIsLive,
  );
  const checkoutReady = hasRealProductIds && serverConfigured;
  let initialCustomer: { name: string; email: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string } | undefined;
  if (user && getStoreRole(user) === "customer") {
    try {
      const supabase = createAdminSupabase();
      const [profileResult, addressResult] = await Promise.all([
        supabase.from("customer_profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle(),
        supabase.from("customer_addresses").select("full_name, phone, line1, line2, city, state, pincode").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const address = addressResult.data;
      initialCustomer = {
        name: address?.full_name || profileResult.data?.full_name || "", email: user.email ?? "", phone: address?.phone || profileResult.data?.phone || "",
        line1: address?.line1 ?? "", line2: address?.line2 ?? "", city: address?.city ?? "", state: address?.state ?? "", pincode: address?.pincode ?? "",
      };
    } catch { initialCustomer = { name: user.user_metadata?.full_name ?? "", email: user.email ?? "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" }; }
  }

  return <main className="checkout-page">
    <header className="checkout-header"><CheckoutBackButton label="Go back" fallback="/store" /><Link href="/store" className="wordmark">FLOVEXA<span>PERFUMES</span></Link><span className="secure-label">SECURE CHECKOUT</span></header>
    <CheckoutExperience items={requested} lines={lines} subtotalPaise={subtotal} pricing={pricing} enabled={checkoutReady} initialCustomer={initialCustomer} />
    <footer className="checkout-footer"><span>© {new Date().getFullYear()} FLOVEXA PERFUMES</span><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/returns">Returns</Link></footer>
  </main>;
}
