"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Award,
  Check,
  ChevronRight,
  ExternalLink,
  FileText,
  Heart,
  HelpCircle,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Printer,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import ShippingLabelModal from "@/components/shipping-label-modal";
import DeliveredOrderThankYouModal from "@/components/delivered-order-thank-you-modal";
import { generateDefaultSku } from "@/lib/products";

type Tab = "orders" | "wishlist" | "addresses" | "profile" | "privilege" | "concierge";

type SellerShipment = {
  status: string;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  seller_profiles: { store_name: string } | null;
};

type OrderItem = {
  id?: string;
  product_id?: string;
  product_slug?: string;
  product_name: string;
  size: string;
  quantity: number;
  sku?: string;
};

type CustomerReview = {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_slug?: string | null;
  product_name: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
};

type Order = {
  id: string;
  order_number: string;
  customer_name?: string;
  phone?: string;
  shipping_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  } | null;
  status: string;
  payment_status: string;
  total_paise: number;
  created_at: string;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  seller_fulfillments: SellerShipment[];
  order_items: OrderItem[];
};

type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

type WishlistProduct = {
  id: string;
  product_id: string;
  slug: string;
  name: string;
  category: string;
  price_paise: number;
  size: string;
  image_url: string | null;
  accent: string;
};

type ReturnRequest = {
  id: string;
  order_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};

type AccountData = {
  email: string;
  profile: { full_name: string; phone: string; gender: string };
  addresses: Address[];
  wishlist: WishlistProduct[];
  orders: Order[];
  returns: ReturnRequest[];
  reviews?: CustomerReview[];
};

const emptyAddress: Address = {
  id: "",
  label: "Home",
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  is_default: true,
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    paise / 100
  );

function resolvePrimaryImage(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
        return parsed[0];
      }
    } catch {}
  }
  if (trimmed.includes(",")) {
    const first = trimmed.split(",")[0]?.trim();
    if (first) return first;
  }
  return trimmed;
}



export default function CustomerAccount({ email }: { email: string }) {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("orders");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", phone: "", gender: "prefer_not_to_say" });
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [editingAddress, setEditingAddress] = useState(false);
  const [returningOrder, setReturningOrder] = useState("");
  const [returnReason, setReturnReason] = useState("damaged");
  const [returnDetails, setReturnDetails] = useState("");
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "in_transit" | "delivered">("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedLabelOrder, setSelectedLabelOrder] = useState<Order | null>(null);
  const [reviewingItem, setReviewingItem] = useState<{
    order: Order;
    item: OrderItem;
    existingReview?: CustomerReview;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>("");
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [deliveredThankYouOrder, setDeliveredThankYouOrder] = useState<Order | null>(null);

  async function handleCancelOrder(order: Order) {
    if (!confirm(`Are you sure you want to cancel Order #${order.order_number}? Orders can only be cancelled within 24 hours of placement.`)) {
      return;
    }
    setCancellingOrderId(order.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/account/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not cancel order.");
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orders: prev.orders.map((o) => (o.id === order.id ? { ...o, status: "cancelled" } : o)),
        };
      });
      setNotice(result.message || `Order #${order.order_number} cancelled successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setCancellingOrderId(null);
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const res = await response.json().catch(() => ({}));
          throw new Error(res.error || "Could not load account data.");
        }
        return response.json();
      })
      .then((result) => {
        if (!active) return;
        setData(result);
        setProfile({
          fullName: result.profile?.full_name || "",
          phone: result.profile?.phone || "",
          gender: result.profile?.gender || "prefer_not_to_say",
        });
        setLoading(false);

        // Auto-trigger luxury Thank You & Rating popup for delivered orders awaiting review
        try {
          const unreviewedDelivered = (result.orders ?? []).find(
            (o: Order) =>
              o.status === "delivered" &&
              !localStorage.getItem(`flovexa_thankyou_dismissed_${o.id}`) &&
              !localStorage.getItem(`flovexa_reviewed_order_${o.id}`) &&
              !(result.reviews ?? []).some((r: CustomerReview) => r.order_id === o.id)
          );
          if (unreviewedDelivered) {
            setDeliveredThankYouOrder(unreviewedDelivered);
          }
        } catch {}
      })
      .catch((err) => {
        if (!active) return;
        console.warn("Account load fallback:", err);
        setError(err instanceof Error ? err.message : "Could not load account data.");
        setData({
          email,
          profile: { full_name: "", phone: "", gender: "prefer_not_to_say" },
          addresses: [],
          wishlist: [],
          orders: [],
          returns: [],
        });
        setLoading(false);
      });

    void (async () => {
      try {
        const pendingProduct = sessionStorage.getItem("flovexa-pending-wishlist");
        if (pendingProduct) {
          await fetch("/api/account/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: pendingProduct }),
          });
          sessionStorage.removeItem("flovexa-pending-wishlist");
        }
      } catch {}
    })();

    return () => {
      active = false;
    };
  }, [email]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save your profile.");
      setData((current) => (current ? { ...current, profile: result.profile } : current));
      setNotice("Your profile has been saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(address),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save this address.");
      setData((current) =>
        current
          ? {
              ...current,
              addresses: [
                result.address,
                ...current.addresses
                  .filter((item) => item.id !== result.address.id)
                  .map((item) => (result.address.is_default ? { ...item, is_default: false } : item)),
              ],
            }
          : current
      );
      setAddress(emptyAddress);
      setEditingAddress(false);
      setNotice("Delivery address saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this address.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!window.confirm("Remove this saved delivery address?")) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/account/addresses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not remove this address.");
      setData((current) =>
        current ? { ...current, addresses: current.addresses.filter((item) => item.id !== id) } : current
      );
      setNotice("Delivery address removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this address.");
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewingItem) return;
    setReviewSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: reviewingItem.order.id,
          productId: reviewingItem.item.product_id,
          productSlug: reviewingItem.item.product_slug,
          productName: reviewingItem.item.product_name,
          rating: reviewRating,
          title: reviewTitle.trim(),
          comment: reviewComment.trim(),
          location: reviewingItem.order.shipping_address?.city,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not publish your review.");
      }

      setNotice("Thank you! Your verified fragrance review has been published.");
      if (result.review && data) {
        setData({
          ...data,
          reviews: [
            result.review,
            ...(data.reviews ?? []).filter(
              (r) =>
                !(
                  r.order_id === reviewingItem.order.id &&
                  r.product_name.toLowerCase() === reviewingItem.item.product_name.toLowerCase()
                )
            ),
          ],
        });
      }
      setReviewingItem(null);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Could not publish review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function removeWishlist(productId: string) {
    try {
      const response = await fetch("/api/account/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Could not update saved perfumes.");
      }
      setData((current) =>
        current ? { ...current, wishlist: current.wishlist.filter((item) => item.product_id !== productId) } : current
      );
      try {
        const stored = localStorage.getItem("flovexa-wishlist");
        if (stored) {
          const list: string[] = JSON.parse(stored);
          localStorage.setItem("flovexa-wishlist", JSON.stringify(list.filter((id) => id !== productId)));
        }
      } catch {}
      setNotice("Perfume removed from your saved collection.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update saved perfumes.");
    }
  }

  function handleAddToCart(item: { product_id: string; name: string }) {
    try {
      const stored = localStorage.getItem("flovexa-cart");
      const cart: Array<{ productId: string; quantity: number }> = stored ? JSON.parse(stored) : [];
      const existing = cart.find((c) => c.productId === item.product_id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ productId: item.product_id, quantity: 1 });
      }
      localStorage.setItem("flovexa-cart", JSON.stringify(cart));
      setAddedProductId(item.product_id);
      setNotice(`"${item.name}" added to your shopping bag.`);
      setTimeout(() => setAddedProductId(null), 2500);
    } catch {
      setError("Could not add perfume to bag.");
    }
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: returningOrder, reason: returnReason, details: returnDetails }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit your return request.");
      setData((current) => (current ? { ...current, returns: [result.returnRequest, ...current.returns] } : current));
      setReturningOrder("");
      setReturnDetails("");
      setNotice("Your return request was submitted. The store concierge will contact you shortly.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not submit your return request.");
    } finally {
      setBusy(false);
    }
  }

  // Derive counts & metadata
  const ordersCount = data?.orders?.length ?? 0;
  const wishlistCount = data?.wishlist?.length ?? 0;
  const addressesCount = data?.addresses?.length ?? 0;
  const displayName = profile.fullName.trim() || email.split("@")[0] || "Customer";
  const avatarLetter = (displayName[0] || "F").toUpperCase();

  const filteredOrders = (data?.orders || []).filter((o) => {
    if (orderFilter === "in_transit") {
      return ["processing", "packed", "shipped", "out_for_delivery"].includes(o.status);
    }
    if (orderFilter === "delivered") {
      return o.status === "delivered";
    }
    return true;
  });

  const faqs = [
    {
      q: "How long does standard delivery take?",
      a: "All Flovexa orders are dispatched within 24 hours from our luxury fragrance atelier. Standard metro delivery arrives in 2-3 business days, and rest of India takes 3-5 business days via BlueDart & Delhivery Express.",
    },
    {
      q: "Are Flovexa perfumes 100% genuine and original?",
      a: "Yes. Every perfume is formulated, batch-tested, and matured in certified artisanal laboratories using pure French essential oils and natural extracts with IFRA compliance.",
    },
    {
      q: "What is your return & replacement policy?",
      a: "We offer hassle-free 7-day replacements for any items that arrive broken, leaking, or damaged in transit. You can initiate a replacement right from the 'My Orders' tab above.",
    },
  ];

  return (
    <div className="account-container-v3">
      {/* 1. VIP Customer Hero Header */}
      <div className="customer-hero-card">
        <div className="customer-hero-profile">
          <div className="customer-avatar-wrap">
            <span className="customer-avatar-letter">{avatarLetter}</span>
            <span className="customer-avatar-badge" title="Privilege Member">
              <Sparkles size={11} />
            </span>
          </div>
          <div className="customer-hero-info">
            <div className="customer-tier-tag">
              <Sparkles size={11} /> FLOVEXA PRIVILEGE NOIR CLUB
            </div>
            <h1 className="customer-hero-title">Welcome back, {displayName}</h1>
            <p className="customer-hero-sub">
              <span>{email}</span>
              {profile.phone ? (
                <>
                  <span className="hero-bullet">•</span>
                  <span>{profile.phone}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="customer-hero-stats">
          <button
            type="button"
            className={`hero-stat-card ${tab === "orders" ? "active" : ""}`}
            onClick={() => setTab("orders")}
          >
            <div className="hero-stat-icon-wrap">
              <Package size={18} />
            </div>
            <div className="hero-stat-text">
              <strong className="hero-stat-num">{ordersCount}</strong>
              <span className="hero-stat-lbl">Orders Placed</span>
            </div>
          </button>

          <button
            type="button"
            className={`hero-stat-card ${tab === "wishlist" ? "active" : ""}`}
            onClick={() => setTab("wishlist")}
          >
            <div className="hero-stat-icon-wrap">
              <Heart size={18} />
            </div>
            <div className="hero-stat-text">
              <strong className="hero-stat-num">{wishlistCount}</strong>
              <span className="hero-stat-lbl">Saved Scents</span>
            </div>
          </button>

          <button
            type="button"
            className={`hero-stat-card ${tab === "addresses" ? "active" : ""}`}
            onClick={() => setTab("addresses")}
          >
            <div className="hero-stat-icon-wrap">
              <MapPin size={18} />
            </div>
            <div className="hero-stat-text">
              <strong className="hero-stat-num">{addressesCount}</strong>
              <span className="hero-stat-lbl">Addresses</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Notifications / Feedback Toasts */}
      {error && (
        <div className="account-toast-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="account-toast-success" role="status">
          <Check size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="account-loading-card">
          <div className="account-loading-spinner" />
          <p>Loading your fragrance wardrobe &amp; details…</p>
        </div>
      )}

      {/* 3. Main Dashboard Two-Column Grid */}
      {data && (
        <div className="account-layout-grid">
          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="account-sidebar">
            <div className="account-menu-card">
              <div className="account-menu-label">CUSTOMER MENU</div>
              <nav className="account-sidebar-nav" aria-label="Customer portal menu">
                <button
                  type="button"
                  className={`account-nav-item ${tab === "orders" ? "active" : ""}`}
                  onClick={() => {
                    setTab("orders");
                    setError("");
                    setNotice("");
                  }}
                >
                  <Package size={17} />
                  <span>My Orders &amp; Tracking</span>
                  {ordersCount > 0 && <span className="nav-badge">{ordersCount}</span>}
                </button>

                <button
                  type="button"
                  className={`account-nav-item ${tab === "wishlist" ? "active" : ""}`}
                  onClick={() => {
                    setTab("wishlist");
                    setError("");
                    setNotice("");
                  }}
                >
                  <Heart size={17} />
                  <span>Saved Fragrances</span>
                  {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
                </button>

                <button
                  type="button"
                  className={`account-nav-item ${tab === "addresses" ? "active" : ""}`}
                  onClick={() => {
                    setTab("addresses");
                    setError("");
                    setNotice("");
                  }}
                >
                  <MapPin size={17} />
                  <span>Delivery Addresses</span>
                  {addressesCount > 0 && <span className="nav-badge">{addressesCount}</span>}
                </button>

                <button
                  type="button"
                  className={`account-nav-item ${tab === "profile" ? "active" : ""}`}
                  onClick={() => {
                    setTab("profile");
                    setError("");
                    setNotice("");
                  }}
                >
                  <UserRound size={17} />
                  <span>Profile &amp; Details</span>
                </button>

                <div className="sidebar-divider" />

                <button
                  type="button"
                  className={`account-nav-item ${tab === "privilege" ? "active" : ""}`}
                  onClick={() => {
                    setTab("privilege");
                    setError("");
                    setNotice("");
                  }}
                >
                  <Award size={17} />
                  <span>Privilege Noir Perks</span>
                  <span className="nav-badge-gold">VIP</span>
                </button>

                <button
                  type="button"
                  className={`account-nav-item ${tab === "concierge" ? "active" : ""}`}
                  onClick={() => {
                    setTab("concierge");
                    setError("");
                    setNotice("");
                  }}
                >
                  <HelpCircle size={17} />
                  <span>Concierge &amp; Help</span>
                </button>
              </nav>
            </div>

            {/* Privilege Membership Mini Card */}
            <div className="privilege-mini-card">
              <div className="privilege-mini-top">
                <span className="privilege-mini-tag">MEMBERSHIP</span>
                <Sparkles size={14} className="privilege-star" />
              </div>
              <h4 className="privilege-mini-title">Privilege Noir Member</h4>
              <p className="privilege-mini-desc">
                Complimentary 2ml artisanal tester vials with every order + Priority shipping across India.
              </p>
              <button
                type="button"
                className="privilege-mini-link"
                onClick={() => setTab("privilege")}
              >
                View all VIP perks <ChevronRight size={13} />
              </button>
            </div>

            {/* Quick WhatsApp Concierge Button */}
            <a
              href="https://wa.me/919662765757?text=Hello%20Flovexa%20Concierge,%20I%20have%20an%20inquiry%20regarding%20my%20perfume%20account"
              target="_blank"
              rel="noreferrer"
              className="account-whatsapp-card"
            >
              <div className="whatsapp-icon-circle">
                <MessageCircle size={18} />
              </div>
              <div className="whatsapp-card-text">
                <strong>Need Fragrance Advice?</strong>
                <span>Chat with Concierge on WhatsApp</span>
              </div>
            </a>
          </aside>

          {/* RIGHT MAIN CONTENT AREA */}
          <section className="account-main-pane">
            {/* TAB 1: MY ORDERS */}
            {tab === "orders" && (
              <div className="account-tab-card">
                <div className="tab-card-header">
                  <div>
                    <h2 className="tab-card-title">My Orders &amp; Live Tracking</h2>
                    <p className="tab-card-sub">
                      Track your fragrance shipments, view receipts, and manage deliveries.
                    </p>
                  </div>
                  <div className="order-filter-pills">
                    <button
                      type="button"
                      className={`filter-pill ${orderFilter === "all" ? "active" : ""}`}
                      onClick={() => setOrderFilter("all")}
                    >
                      All ({ordersCount})
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${orderFilter === "in_transit" ? "active" : ""}`}
                      onClick={() => setOrderFilter("in_transit")}
                    >
                      In Transit
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${orderFilter === "delivered" ? "active" : ""}`}
                      onClick={() => setOrderFilter("delivered")}
                    >
                      Delivered
                    </button>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="order-empty-experience">
                    <div className="order-empty-hero">
                      <div className="order-empty-icon-ring">
                        <Package size={34} />
                      </div>
                      <h3>Your Fragrance Wardrobe is Waiting</h3>
                      <p>
                        You haven’t placed any orders yet. Every handcrafted Flovexa fragrance arrives in our
                        signature rigid gold-embossed gift box with 2 complimentary tester vials.
                      </p>
                      <Link href="/store" className="primary-gold-btn">
                        <ShoppingBag size={15} /> Explore Fragrance Collection
                      </Link>
                    </div>


                  </div>
                ) : (
                  <div className="orders-rich-list">
                    {filteredOrders.map((order) => {
                      const returnRequest = data.returns.find((item) => item.order_id === order.id);
                      const canReturn =
                        order.payment_status === "captured" &&
                        !["cancelled", "refunded", "pending_payment"].includes(order.status);
                      const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                      const isDelivered = order.status === "delivered";
                      const isShipped = ["shipped", "out_for_delivery"].includes(order.status) || isDelivered;
                      const isPacked = ["confirmed", "processing", "packed"].includes(order.status) || isShipped;
                      const isConfirmed = isPacked;

                      const placedAtMs = new Date(order.created_at).getTime();
                      const hoursSincePlaced = (Date.now() - placedAtMs) / (1000 * 60 * 60);
                      const canCancelOrder = hoursSincePlaced < 24 && !["shipped", "delivered", "cancelled"].includes(order.status);

                      const totalBottles = order.order_items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                      const isCombo = totalBottles > 1 || order.order_items.length > 1;

                      return (
                        <div key={order.order_number} className="order-rich-card">
                          <div className="order-card-topbar">
                            <div className="order-topbar-meta">
                              <span className="order-badge-num">Order #{order.order_number}</span>
                              <span className="order-placed-date">Placed on {orderDate}</span>
                            </div>
                            <div className="order-topbar-right">
                              {isCombo && (
                                <span className="order-combo-micro-tag">
                                  <Sparkles size={11} /> Combo Pack ({totalBottles})
                                </span>
                              )}
                              <span className={`order-status-badge status-${order.status}`}>
                                {order.status.replaceAll("_", " ")}
                              </span>
                              <strong className="order-total-price">{money(order.total_paise)}</strong>
                            </div>
                          </div>

                          {/* 4-Step Visual Delivery Progress */}
                          <div className="order-progress-stepper">
                            <div className="stepper-step completed">
                              <div className="stepper-circle">✓</div>
                              <span>Placed</span>
                            </div>
                            <div className={`stepper-line ${isConfirmed ? "active" : ""}`} />
                            <div className={`stepper-step ${isConfirmed ? "completed" : ""}`}>
                              <div className="stepper-circle">{isConfirmed ? "✓" : "2"}</div>
                              <span>Order Packed</span>
                            </div>
                            <div className={`stepper-line ${isShipped ? "active" : ""}`} />
                            <div className={`stepper-step ${isShipped ? "completed" : ""}`}>
                              <div className="stepper-circle">{isShipped ? "✓" : "3"}</div>
                              <span>Dispatched</span>
                            </div>
                            <div className={`stepper-line ${isDelivered ? "active" : ""}`} />
                            <div className={`stepper-step ${isDelivered ? "completed" : ""}`}>
                              <div className="stepper-circle">{isDelivered ? "✓" : "4"}</div>
                              <span>Delivered</span>
                            </div>
                          </div>

                          {/* Multi-Perfume Consolidated Combo Banner */}
                          {isCombo && (
                            <div className="order-combo-banner">
                              <div className="order-combo-badge-row">
                                <span className="order-combo-pill">
                                  <Sparkles size={12} /> Multi-Perfume Combo ({totalBottles} Fragrances)
                                </span>
                                <span className="order-combo-label-tag">
                                  📦 1 Consolidated Shipping Label
                                </span>
                              </div>
                              <p className="order-combo-desc">
                                All {totalBottles} perfumes are consolidated and packed together in 1 signature luxury presentation box under <strong>1 single shipping label</strong> to your delivery address.
                              </p>
                            </div>
                          )}

                          {/* Order Products List */}
                          <div className="order-items-grid">
                            {order.order_items.map((item, idx) => {
                              const itemReview = (data.reviews ?? []).find(
                                (r) =>
                                  r.order_id === order.id &&
                                  (r.product_name.toLowerCase() === item.product_name.toLowerCase() ||
                                    (item.product_id && r.product_id === item.product_id))
                              );

                              return (
                                <div key={`${order.order_number}-${idx}`} className="order-item-chip">
                                  <div className="order-item-bullet-icon">
                                    <Package size={14} />
                                  </div>
                                  <div className="order-item-desc">
                                    <strong className="item-name">{item.product_name}</strong>
                                    <span className="item-meta">
                                      Size: {item.size} · Quantity: {item.quantity} · <code style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", background: "#f5f0ea", padding: "1px 5px", borderRadius: "3px", color: "#6a5c4e" }}>SKU: {item.sku || generateDefaultSku(item.product_name, item.size, idx)}</code>
                                    </span>
                                  </div>

                                  {/* Verified Review Action for Delivered Orders */}
                                  {isDelivered && (
                                    <div className="order-item-review-wrap">
                                      {itemReview ? (
                                        <button
                                          type="button"
                                          className="order-item-reviewed-pill"
                                          onClick={() => {
                                            setReviewingItem({ order, item, existingReview: itemReview });
                                            setReviewRating(itemReview.rating);
                                            setReviewTitle(itemReview.title);
                                            setReviewComment(itemReview.comment);
                                          }}
                                          title="Verified review published. Click to view or edit."
                                        >
                                          <span className="reviewed-stars">{"★".repeat(itemReview.rating)}</span>
                                          <span>Reviewed ({itemReview.rating}/5)</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="order-item-rate-btn"
                                          onClick={() => {
                                            setReviewingItem({ order, item });
                                            setReviewRating(5);
                                            setReviewTitle("");
                                            setReviewComment("");
                                          }}
                                          title="Rate & Review this delivered fragrance"
                                        >
                                          <Star size={13} fill="#aa8050" color="#aa8050" />
                                          <span>Rate &amp; Review</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Order Footer & Actions */}
                          <div className="order-card-actions">
                            <div className="order-shipment-meta">
                              {order.tracking_url ? (
                                <a
                                  href={order.tracking_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="track-package-btn"
                                >
                                  <ExternalLink size={13} />
                                  <span>Track Courier Package</span>
                                </a>
                              ) : (
                                <span className="order-dispatch-text">
                                  <Truck size={14} /> Being carefully packed at our fragrance atelier
                                </span>
                              )}

                              <button
                                type="button"
                                className="order-btn-view-label"
                                onClick={() => setSelectedLabelOrder(order)}
                                title="View consolidated parcel shipping label & packing manifest"
                              >
                                <Tag size={13} />
                                <span>{isCombo ? `View Combo Shipping Label (${totalBottles} in 1 Box)` : "View Shipping Label"}</span>
                              </button>
                            </div>

                            <div className="order-support-actions" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              {/* Delivered Order Thank You & Review Action */}
                              {isDelivered && (
                                <button
                                  type="button"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: "#fbf6ed",
                                    color: "#8a6639",
                                    border: "1px solid #ebd9bf",
                                    padding: "6px 14px",
                                    borderRadius: "3px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  onClick={() => setDeliveredThankYouOrder(order)}
                                  title="Share your review & rating for this delivered fragrance"
                                >
                                  <Star size={13} fill="#aa8050" color="#aa8050" />
                                  <span>Rate &amp; Review Order</span>
                                </button>
                              )}

                              {/* 24-Hour Order Cancellation */}
                              {canCancelOrder ? (
                                <button
                                  type="button"
                                  className="order-cancel-btn"
                                  style={{ background: "#7a2b2b", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "3px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                  onClick={() => void handleCancelOrder(order)}
                                  disabled={cancellingOrderId === order.id}
                                >
                                  <X size={13} />
                                  {cancellingOrderId === order.id ? "Cancelling…" : `Cancel Order (${Math.max(1, Math.round(24 - hoursSincePlaced))}h remaining)`}
                                </button>
                              ) : !["shipped", "delivered", "cancelled"].includes(order.status) ? (
                                <span style={{ fontSize: "11px", color: "#8a7e72", background: "#f0ece7", padding: "4px 8px", borderRadius: "3px" }}>
                                  Cancellation closed (24h window passed)
                                </span>
                              ) : null}

                              {order.status === "cancelled" && (
                                <span style={{ fontSize: "11px", color: "#8e2a2a", background: "#fde8e8", padding: "4px 10px", borderRadius: "3px", fontWeight: 700 }}>
                                  Order Cancelled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Express Courier Live Tracking Bar */}
                          {order.tracking_number && (
                            <div style={{ marginTop: "12px", padding: "10px 14px", background: "#f5f8f3", border: "1px solid #d4e3ce", borderRadius: "4px", fontSize: "12px", color: "#2d5423", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Truck size={15} color="#3b6032" />
                                <span>
                                  Logistics Partner: <strong>{order.tracking_carrier || "Mahavir Express"}</strong> · Consignment ID: <code style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, background: "#e8f0e5", padding: "2px 7px", borderRadius: "3px", color: "#1f3d17" }}>{order.tracking_number}</code>
                                </span>
                              </div>
                              <a
                                href={order.tracking_url || "https://shreemahavircourier.com/"}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#aa8050", fontWeight: 700, textDecoration: "underline" }}
                              >
                                <ExternalLink size={12} /> Track on Mahavir Express ↗
                              </a>
                            </div>
                          )}

                          {/* Strict No-Return Policy Notice */}
                          <div style={{ marginTop: "10px", padding: "9px 12px", background: "#fdfbf7", border: "1px solid #ebd9bf", borderRadius: "4px", fontSize: "11px", color: "#6e5d4e", display: "flex", alignItems: "center", gap: "8px" }}>
                            <ShieldAlert size={14} color="#aa8050" style={{ flexShrink: 0 }} />
                            <span>
                              <strong>Strict No-Return Policy:</strong> Due to artisanal fragrance hygiene &amp; bottle seal safety, perfume orders are final sale once dispatched. Cancellations are only permitted within 24 hours of placement before courier handover.
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SAVED FRAGRANCES (WISHLIST) */}
            {tab === "wishlist" && (
              <div className="account-tab-card">
                <div className="tab-card-header">
                  <div>
                    <h2 className="tab-card-title">Saved Fragrances &amp; Wishlist ({wishlistCount})</h2>
                    <p className="tab-card-sub">
                      Your curated collection of artisanal fragrances ready to purchase.
                    </p>
                  </div>
                  <Link href="/store" className="secondary-btn">
                    Browse More Scents <ArrowRight size={13} />
                  </Link>
                </div>

                {data.wishlist.length === 0 ? (
                  <div className="order-empty-hero">
                    <div className="order-empty-icon-ring">
                      <Heart size={34} />
                    </div>
                    <h3>Your Saved Fragrance Collection is Empty</h3>
                    <p>
                      Tap the heart ♡ icon on any fragrance in the store to save it here for later.
                    </p>
                    <Link href="/store" className="primary-gold-btn">
                      <ShoppingBag size={15} /> Discover Signature Perfumes
                    </Link>
                  </div>
                ) : (
                  <div className="wishlist-rich-grid">
                    {data.wishlist.map((item) => {
                      const imageSrc = resolvePrimaryImage(item.image_url);
                      return (
                        <div key={item.product_id} className="wishlist-rich-card">
                          <Link href={`/products/${item.slug}`} className="wishlist-thumb-wrap">
                            {imageSrc ? (
                              <Image
                                src={imageSrc}
                                alt={item.name}
                                width={220}
                                height={220}
                                unoptimized
                                className="wishlist-image"
                              />
                            ) : (
                              <div
                                className="wishlist-fallback-box"
                                style={{ background: item.accent || "#ad7045" }}
                              >
                                <span>F.</span>
                              </div>
                            )}
                          </Link>

                          <div className="wishlist-details">
                            <span className="wishlist-category">
                              {item.category} · {item.size}
                            </span>
                            <Link href={`/products/${item.slug}`} className="wishlist-name">
                              {item.name}
                            </Link>
                            <strong className="wishlist-price">{money(item.price_paise)}</strong>
                          </div>

                          <div className="wishlist-card-actions">
                            <button
                              type="button"
                              className="wishlist-add-bag-btn"
                              onClick={() => handleAddToCart({ product_id: item.product_id, name: item.name })}
                            >
                              {addedProductId === item.product_id ? (
                                <>
                                  <Check size={14} /> In Shopping Bag!
                                </>
                              ) : (
                                <>
                                  <ShoppingBag size={14} /> Move to Bag
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="wishlist-delete-btn"
                              onClick={() => void removeWishlist(item.product_id)}
                              title="Remove from saved"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DELIVERY ADDRESSES */}
            {tab === "addresses" && (
              <div className="account-tab-card">
                <div className="tab-card-header">
                  <div>
                    <h2 className="tab-card-title">Saved Delivery Addresses ({addressesCount})</h2>
                    <p className="tab-card-sub">
                      Manage delivery destinations across India for 1-click expedited checkout.
                    </p>
                  </div>
                  {!editingAddress && (
                    <button
                      type="button"
                      className="primary-gold-btn"
                      onClick={() => {
                        setAddress({
                          ...emptyAddress,
                          full_name: profile.fullName || "",
                          phone: profile.phone || "",
                          is_default: data.addresses.length === 0,
                        });
                        setEditingAddress(true);
                      }}
                    >
                      <Plus size={15} /> Add New Address
                    </button>
                  )}
                </div>

                {editingAddress && (
                  <form className="rich-address-form" onSubmit={saveAddress}>
                    <h3>{address.id ? "Edit Delivery Address" : "Add a New Delivery Address"}</h3>

                    <div className="form-fields-grid-2">
                      <label>
                        Address Tag / Label *
                        <input
                          required
                          maxLength={40}
                          value={address.label}
                          onChange={(e) => setAddress({ ...address, label: e.target.value })}
                          placeholder="e.g. Home, Office, Studio"
                        />
                      </label>

                      <label>
                        Recipient Full Name *
                        <input
                          required
                          maxLength={100}
                          value={address.full_name}
                          onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                          placeholder="Recipient name for parcel"
                        />
                      </label>

                      <label>
                        Contact Mobile Phone *
                        <input
                          required
                          type="tel"
                          maxLength={20}
                          value={address.phone}
                          onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                        />
                      </label>

                      <label>
                        PIN Code (6 digits) *
                        <input
                          required
                          pattern="\d{6}"
                          maxLength={6}
                          inputMode="numeric"
                          value={address.pincode}
                          onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                          placeholder="e.g. 400001"
                        />
                      </label>

                      <label className="span-full">
                        Flat / House No. / Building / Street Address *
                        <input
                          required
                          maxLength={150}
                          value={address.line1}
                          onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                          placeholder="e.g. 402, Royale Heights, Linking Road"
                        />
                      </label>

                      <label className="span-full">
                        Locality / Landmark
                        <input
                          maxLength={150}
                          value={address.line2}
                          onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                          placeholder="e.g. Near Rose Garden, Bandra West"
                        />
                      </label>

                      <label>
                        City *
                        <input
                          required
                          maxLength={80}
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          placeholder="e.g. Mumbai"
                        />
                      </label>

                      <label>
                        State *
                        <input
                          required
                          maxLength={80}
                          value={address.state}
                          onChange={(e) => setAddress({ ...address, state: e.target.value })}
                          placeholder="e.g. Maharashtra"
                        />
                      </label>
                    </div>

                    <label className="checkbox-gold-label">
                      <input
                        type="checkbox"
                        checked={address.is_default}
                        onChange={(e) => setAddress({ ...address, is_default: e.target.checked })}
                      />
                      <span>Set this as my default delivery address</span>
                    </label>

                    <div className="form-action-row">
                      <button type="submit" className="primary-gold-btn" disabled={busy}>
                        {busy ? "Saving…" : "Save Address"}
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          setEditingAddress(false);
                          setAddress(emptyAddress);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {data.addresses.length === 0 && !editingAddress ? (
                  <div className="order-empty-hero">
                    <div className="order-empty-icon-ring">
                      <MapPin size={34} />
                    </div>
                    <h3>No Saved Delivery Addresses</h3>
                    <p>
                      Save your home, office, or gifting address to enjoy rapid 1-click fragrance checkout.
                    </p>
                    <button
                      type="button"
                      className="primary-gold-btn"
                      onClick={() => {
                        setAddress({
                          ...emptyAddress,
                          full_name: profile.fullName || "",
                          phone: profile.phone || "",
                          is_default: true,
                        });
                        setEditingAddress(true);
                      }}
                    >
                      <Plus size={15} /> Add Delivery Address
                    </button>
                  </div>
                ) : (
                  <div className="address-rich-grid">
                    {data.addresses.map((item) => (
                      <div
                        key={item.id}
                        className={`address-rich-card ${item.is_default ? "is-default" : ""}`}
                      >
                        <div className="address-card-header">
                          <span className="address-label-badge">{item.label}</span>
                          {item.is_default && <span className="default-pill">PRIMARY DEFAULT</span>}
                        </div>

                        <strong className="address-recipient-name">{item.full_name}</strong>
                        <span className="address-recipient-phone">{item.phone}</span>
                        <p className="address-full-text">
                          {item.line1}
                          {item.line2 ? `, ${item.line2}` : ""}
                          <br />
                          {item.city}, {item.state} – {item.pincode}
                        </p>

                        <div className="address-card-btns">
                          <button
                            type="button"
                            className="address-action-btn"
                            onClick={() => {
                              setAddress(item);
                              setEditingAddress(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="address-action-btn danger"
                            onClick={() => void deleteAddress(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PROFILE & PREFERENCES */}
            {tab === "profile" && (
              <div className="account-tab-card">
                <div className="tab-card-header">
                  <div>
                    <h2 className="tab-card-title">Personal Profile &amp; Preferences</h2>
                    <p className="tab-card-sub">
                      Update your contact information and customize your fragrance journey.
                    </p>
                  </div>
                </div>

                <form className="profile-rich-form" onSubmit={saveProfile}>
                  <div className="profile-verified-banner">
                    <div className="verified-icon-wrap">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <span className="verified-label">Registered Account Email</span>
                      <strong className="verified-email">{data.email}</strong>
                      <small className="verified-note">
                        Order confirmations and courier dispatch receipts are sent here.
                      </small>
                    </div>
                  </div>

                  <div className="form-fields-grid-2">
                    <label>
                      Full Name *
                      <input
                        required
                        minLength={2}
                        maxLength={100}
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        placeholder="e.g. Aryan Sharma"
                      />
                    </label>

                    <label>
                      Contact Mobile Number *
                      <input
                        required
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </label>

                    <label className="span-full">
                      Gender
                      <select
                        value={profile.gender}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      >
                        <option value="prefer_not_to_say">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-action-row">
                    <button type="submit" className="primary-gold-btn" disabled={busy}>
                      {busy ? "Saving Changes…" : "Save Profile Details"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 5: PRIVILEGE NOIR CLUB PERKS */}
            {tab === "privilege" && (
              <div className="account-tab-card">
                <div className="tab-card-header">
                  <div>
                    <h2 className="tab-card-title">Flovexa Privilege Noir Club</h2>
                    <p className="tab-card-sub">
                      Exclusive rewards, private invitations, and artisanal privileges reserved for you.
                    </p>
                  </div>
                  <span className="privilege-active-tag">
                    <Sparkles size={12} /> Status: Active Member
                  </span>
                </div>

                {/* Metallic VIP Card Graphic */}
                <div className="privilege-membership-card">
                  <div className="card-top-row">
                    <div className="card-logo">FLOVEXA<span>PERFUMES</span></div>
                    <span className="card-tier-label">NOIR PRIVILEGE</span>
                  </div>
                  <div className="card-middle">
                    <div className="card-chip" />
                    <span className="card-holder-name">{displayName.toUpperCase()}</span>
                  </div>
                  <div className="card-bottom-row">
                    <span>MEMBER SINCE 2026</span>
                    <span>TIER: CONNOISSEUR</span>
                  </div>
                </div>

                {/* 4 Member Privileges Grid */}
                <div className="privilege-perks-grid">
                  <div className="perk-card">
                    <div className="perk-icon-wrap">
                      <Sparkles size={20} />
                    </div>
                    <h4>Complimentary 2ml Tester Vials</h4>
                    <p>
                      Receive two complimentary artisanal 2ml sample sprays with every full-size perfume order to discover new scents.
                    </p>
                  </div>

                  <div className="perk-card">
                    <div className="perk-icon-wrap">
                      <Truck size={20} />
                    </div>
                    <h4>Priority Express Air Courier</h4>
                    <p>
                      All your packages receive priority dispatch with BlueDart Air express courier at zero extra shipping charges.
                    </p>
                  </div>

                  <div className="perk-card">
                    <div className="perk-icon-wrap">
                      <Award size={20} />
                    </div>
                    <h4>Early Access to Limited Batches</h4>
                    <p>
                      Get 48-hour private early access to small-batch seasonal Extrait de Parfums before public releases.
                    </p>
                  </div>

                  <div className="perk-card">
                    <div className="perk-icon-wrap">
                      <ShoppingBag size={20} />
                    </div>
                    <h4>Handcrafted Gift Presentation</h4>
                    <p>
                      Complimentary luxury rigid presentation gift box and wax-sealed handwritten notes for all gift orders.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: CONCIERGE & HELP */}
            {tab === "concierge" && (
              <div className="account-tab-card">
                <div className="tab-card-header">
                  <div>
                    <h2 className="tab-card-title">Flovexa Concierge &amp; Customer Care</h2>
                    <p className="tab-card-sub">
                      Personalized fragrance recommendations, order tracking, and bespoke client support.
                    </p>
                  </div>
                </div>

                <div className="concierge-contact-cards">
                  <a
                    href="https://wa.me/919662765757?text=Hello%20Flovexa%20Concierge,%20I%20need%20assistance%20with%20my%20order"
                    target="_blank"
                    rel="noreferrer"
                    className="concierge-box whatsapp"
                  >
                    <div className="concierge-box-icon">
                      <MessageCircle size={22} />
                    </div>
                    <div className="concierge-box-text">
                      <strong>WhatsApp Fragrance Concierge</strong>
                      <span>+91 96627 65757 · Instant chat assistance</span>
                    </div>
                    <ArrowRight size={16} className="concierge-arrow" />
                  </a>

                  <a href="mailto:flovexaenterprises@gmail.com" className="concierge-box email">
                    <div className="concierge-box-icon">
                      <HelpCircle size={22} />
                    </div>
                    <div className="concierge-box-text">
                      <strong>Email Support Desk</strong>
                      <span>flovexaenterprises@gmail.com · Replies within 4 hours</span>
                    </div>
                    <ArrowRight size={16} className="concierge-arrow" />
                  </a>
                </div>

                {/* Registered Address & Atelier Info */}
                <div style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: "1px solid #ebd9c8",
                  background: "#fffbf7",
                  marginBottom: "30px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px"
                }}>
                  <div style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "#735338",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <MapPin size={18} />
                  </div>
                  <div style={{ fontSize: "12.5px", lineHeight: "1.6", color: "#4d4138" }}>
                    <strong style={{ fontSize: "13.5px", color: "#221a14", display: "block", marginBottom: "3px" }}>
                      Flovexa Registered Office &amp; Fulfillment Atelier (Surat, Gujarat – 395006)
                    </strong>
                    21, Ramdev Row-House Shopping, Opp. Shivdhara Society, Rajmandir Road, Surat - 395006, Gujarat, India
                    <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "#786555" }}>
                      <span><strong>Helpline / Phone:</strong> +91 96627 65757</span>
                      <span><strong>Official Email:</strong> flovexaenterprises@gmail.com</span>
                      <span><strong>Instagram:</strong> <a href="https://www.instagram.com/flovexa_perfume" target="_blank" rel="noreferrer" style={{ color: "#aa8050" }}>@flovexa_perfume ↗</a></span>
                      <span><strong>Hours:</strong> Mon – Sat, 10:00 AM – 7:00 PM IST</span>
                    </div>
                  </div>
                </div>

                {/* FAQ Accordion */}
                <div className="concierge-faqs">
                  <h3>Frequently Asked Questions</h3>
                  <div className="faq-list">
                    {faqs.map((faq, index) => (
                      <div
                        key={index}
                        className={`faq-item ${openFaq === index ? "open" : ""}`}
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      >
                        <div className="faq-question">
                          <span>{faq.q}</span>
                          <span className="faq-toggle">{openFaq === index ? "−" : "+"}</span>
                        </div>
                        {openFaq === index && <p className="faq-answer">{faq.a}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      {/* Printable Consolidated Shipping Label Modal */}
      {selectedLabelOrder && (
        <ShippingLabelModal
          order={selectedLabelOrder}
          fallbackCustomerName={data?.profile.full_name || profile.fullName}
          fallbackPhone={data?.profile.phone || profile.phone}
          onClose={() => setSelectedLabelOrder(null)}
        />
      )}

      {/* Verified Fragrance Rating & Review Modal */}
      {reviewingItem && (
        <div className="review-modal-scrim" onClick={() => setReviewingItem(null)}>
          <div className="review-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <div>
                <span className="review-modal-eyebrow">VERIFIED PATRON EXPERIENCE</span>
                <h3 className="review-modal-title">Rate &amp; Review {reviewingItem.item.product_name}</h3>
                <p className="review-modal-sub">
                  Delivered on Order #{reviewingItem.order.order_number} · Your review will appear on the product page and storefront.
                </p>
              </div>
              <button
                type="button"
                className="review-modal-close"
                onClick={() => setReviewingItem(null)}
                aria-label="Close review dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitReview} className="review-modal-form">
              <div className="review-form-field">
                <label className="review-field-label">Your Overall Fragrance Rating</label>
                <div className="review-stars-interactive">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      className={`star-choice-btn ${starVal <= reviewRating ? "active" : ""}`}
                      onClick={() => setReviewRating(starVal)}
                      aria-label={`${starVal} star rating`}
                    >
                      <Star
                        size={24}
                        fill={starVal <= reviewRating ? "#e5b23d" : "transparent"}
                        color={starVal <= reviewRating ? "#e5b23d" : "#c5bba8"}
                      />
                    </button>
                  ))}
                  <span className="review-star-hint">
                    {reviewRating === 5 && "Flawless Masterpiece (5/5)"}
                    {reviewRating === 4 && "Great Luxury Sillage (4/5)"}
                    {reviewRating === 3 && "Average Scent (3/5)"}
                    {reviewRating === 2 && "Could Be Better (2/5)"}
                    {reviewRating === 1 && "Not As Expected (1/5)"}
                  </span>
                </div>
              </div>

              <div className="review-form-field">
                <label className="review-field-label">Headline / Title</label>
                <input
                  type="text"
                  required
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g., Intoxicating drydown, lasts over 12 hours"
                  className="review-text-input"
                />
              </div>

              <div className="review-form-field">
                <label className="review-field-label">Your Scent Experience &amp; Notes</label>
                <textarea
                  required
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Describe the projection, sillage, compliments received, and how the fragrance evolves throughout the day..."
                  className="review-textarea"
                />
              </div>

              <div className="review-modal-actions">
                <button
                  type="button"
                  className="review-cancel-btn"
                  onClick={() => setReviewingItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="review-submit-gold-btn"
                >
                  {reviewSubmitting ? "Publishing Review…" : reviewingItem.existingReview ? "Update Review" : "Publish Verified Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Automatic Thank You & Rating Experience Modal for Delivered Orders */}
      {deliveredThankYouOrder && (
        <DeliveredOrderThankYouModal
          order={deliveredThankYouOrder}
          existingReviews={data?.reviews}
          onClose={() => {
            try {
              localStorage.setItem(`flovexa_thankyou_dismissed_${deliveredThankYouOrder.id}`, "true");
            } catch {}
            setDeliveredThankYouOrder(null);
          }}
          onReviewSubmitted={(newReview) => {
            if (newReview && data) {
              setData({
                ...data,
                reviews: [
                  newReview,
                  ...(data.reviews ?? []).filter(
                    (r) =>
                      !(
                        r.order_id === deliveredThankYouOrder.id &&
                        r.product_name.toLowerCase() === (newReview.product_name || "").toLowerCase()
                      )
                  ),
                ],
              });
            }
          }}
        />
      )}
    </div>
  );
}
