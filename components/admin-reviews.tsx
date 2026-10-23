"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";

export type AdminReview = {
  id: string;
  order_id: string | null;
  order_number: string | null;
  product_id: string | null;
  product_slug: string | null;
  product_name: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  featured: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function AdminReviews({ initialReviews }: { initialReviews: AdminReview[] }) {
  const [reviews, setReviews] = useState<AdminReview[]>(initialReviews);
  const [filter, setFilter] = useState<"all" | "featured" | "5_star" | "critical">("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / totalReviews).toFixed(1)
    : "5.0";
  const featuredCount = reviews.filter((r) => r.featured && r.status === "approved").length;
  const verifiedCount = reviews.filter((r) => r.verified_purchase).length;

  const filtered = reviews.filter((r) => {
    if (filter === "featured" && !r.featured) return false;
    if (filter === "5_star" && r.rating !== 5) return false;
    if (filter === "critical" && r.rating > 3) return false;

    if (query.trim()) {
      const q = query.toLowerCase();
      const match =
        r.product_name.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.customer_email.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        (r.order_number && r.order_number.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  async function toggleFeatured(review: AdminReview) {
    setBusyId(review.id);
    setMessage("");
    try {
      const nextFeatured = !review.featured;
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, featured: nextFeatured }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update review.");

      setReviews((curr) =>
        curr.map((r) => (r.id === review.id ? { ...r, featured: nextFeatured } : r))
      );
      setMessage(
        nextFeatured
          ? `Review by ${review.customer_name} is now FEATURED on the main homepage.`
          : `Review by ${review.customer_name} removed from homepage features.`
      );
    } catch (err: any) {
      setMessage(err.message || "Failed to toggle featured status.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(review: AdminReview, nextStatus: "approved" | "rejected") {
    setBusyId(review.id);
    setMessage("");
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      setReviews((curr) =>
        curr.map((r) => (r.id === review.id ? { ...r, status: nextStatus } : r))
      );
      setMessage(`Review status changed to ${nextStatus}.`);
    } catch (err: any) {
      setMessage(err.message || "Failed to update status.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReview(review: AdminReview) {
    if (!window.confirm(`Permanently delete review by ${review.customer_name} for ${review.product_name}?`)) {
      return;
    }
    setBusyId(review.id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(review.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete review.");

      setReviews((curr) => curr.filter((r) => r.id !== review.id));
      setMessage("Review permanently deleted.");
    } catch (err: any) {
      setMessage(err.message || "Failed to delete review.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-reviews-layout">
      {/* Metrics Row */}
      <div className="seller-stats" style={{ marginBottom: 20 }}>
        <article className="stat-card">
          <span className="stat-label">TOTAL RATINGS &amp; REVIEWS</span>
          <strong className="stat-value">{totalReviews}</strong>
          <span className="stat-foot">From verified delivered fragrance orders</span>
        </article>

        <article className="stat-card">
          <span className="stat-label">AVERAGE FRAGRANCE RATING</span>
          <strong className="stat-value" style={{ color: "#d97706" }}>
            {avgRating} ★
          </strong>
          <span className="stat-foot">Pan-India buyer satisfaction score</span>
        </article>

        <article className="stat-card">
          <span className="stat-label">FEATURED ON HOMEPAGE</span>
          <strong className="stat-value" style={{ color: "#aa8050" }}>
            {featuredCount}
          </strong>
          <span className="stat-foot">Live in &quot;Voices of Connoisseurs&quot; section</span>
        </article>

        <article className="stat-card">
          <span className="stat-label">VERIFIED BUYERS</span>
          <strong className="stat-value" style={{ color: "#059669" }}>
            {verifiedCount}
          </strong>
          <span className="stat-foot">100% verified delivered order provenance</span>
        </article>
      </div>

      {message && (
        <div className="account-toast-success" role="status" style={{ marginBottom: 16 }}>
          <Check size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Main Panel */}
      <section className="admin-panel">
        <div className="admin-panel-tools" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Verified Fragrance Reviews &amp; Social Proof</h2>
            <span style={{ fontSize: 11, color: "#82796d" }}>
              {filtered.length} of {totalReviews} reviews matching filters
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Filter Pills */}
            <div className="order-filter-pills">
              <button
                type="button"
                className={`filter-pill ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({totalReviews})
              </button>
              <button
                type="button"
                className={`filter-pill ${filter === "featured" ? "active" : ""}`}
                onClick={() => setFilter("featured")}
              >
                Featured ({featuredCount})
              </button>
              <button
                type="button"
                className={`filter-pill ${filter === "5_star" ? "active" : ""}`}
                onClick={() => setFilter("5_star")}
              >
                5 Stars Only
              </button>
              <button
                type="button"
                className={`filter-pill ${filter === "critical" ? "active" : ""}`}
                onClick={() => setFilter("critical")}
              >
                Critical (≤ 3★)
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", minWidth: 220 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="Search scent, buyer, text…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  padding: "7px 12px 7px 30px",
                  fontSize: 12,
                  border: "1px solid #d1c7b8",
                  borderRadius: 8,
                  width: "100%",
                  background: "#fff",
                }}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty" style={{ padding: "48px 24px", textAlign: "center" }}>
            <MessageSquare size={32} style={{ color: "#aa8050", margin: "0 auto 12px" }} />
            <b>No customer reviews found</b>
            <span style={{ fontSize: 12, color: "#82796d" }}>
              When patrons receive delivered orders, they can submit verified ratings which will appear here.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {filtered.map((r) => {
              const isBusy = busyId === r.id;
              const reviewDate = new Date(r.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <article
                  key={r.id}
                  style={{
                    border: r.featured ? "1.5px solid #d4af37" : "1px solid #e5ded4",
                    borderRadius: 12,
                    padding: "16px 20px",
                    background: r.featured ? "#fffdf8" : "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    boxShadow: r.featured ? "0 2px 10px rgba(212, 175, 55, 0.08)" : "none",
                  }}
                >
                  {/* Card Topbar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {/* Product Name Pill */}
                      {r.product_slug ? (
                        <Link
                          href={`/products/${r.product_slug}`}
                          target="_blank"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#aa8050",
                            background: "#f9f6f0",
                            padding: "3px 10px",
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            textDecoration: "none",
                          }}
                        >
                          {r.product_name} <ExternalLink size={10} />
                        </Link>
                      ) : (
                        <strong style={{ fontSize: 13, color: "#2d261e" }}>{r.product_name}</strong>
                      )}

                      {/* Stars */}
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < r.rating ? "#e5b23d" : "transparent"}
                            color={i < r.rating ? "#e5b23d" : "#d1d5db"}
                          />
                        ))}
                      </div>

                      {/* Featured Badge */}
                      {r.featured && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "linear-gradient(135deg, #d4af37, #b8860b)",
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Sparkles size={10} /> HOMEPAGE FEATURED
                        </span>
                      )}

                      {/* Status Badge */}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background:
                            r.status === "approved"
                              ? "#ecfdf5"
                              : r.status === "rejected"
                              ? "#fef2f2"
                              : "#fef3c7",
                          color:
                            r.status === "approved"
                              ? "#065f46"
                              : r.status === "rejected"
                              ? "#991b1b"
                              : "#92400e",
                        }}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: "#82796d" }}>{reviewDate}</div>
                  </div>

                  {/* Headline & Body */}
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 700, color: "#1f1b16" }}>
                      &ldquo;{r.title}&rdquo;
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#4b4337", lineHeight: 1.5 }}>
                      {r.comment}
                    </p>
                  </div>

                  {/* Buyer provenance & Moderation actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      paddingTop: 10,
                      borderTop: "1px solid #f2ede5",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#6b6255" }}>
                      <strong style={{ color: "#1f1b16" }}>{r.customer_name}</strong>
                      <span>·</span>
                      <span>{r.customer_email}</span>
                      {r.location && (
                        <>
                          <span>·</span>
                          <span>{r.location}</span>
                        </>
                      )}
                      {r.order_number && (
                        <>
                          <span>·</span>
                          <span style={{ color: "#aa8050" }}>Order #{r.order_number}</span>
                        </>
                      )}
                      {r.verified_purchase && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#059669",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <CheckCircle2 size={11} /> Verified Buyer
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* 1-Click Feature on Homepage Toggle */}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => toggleFeatured(r)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: r.featured ? "1px solid #aa8050" : "1px solid #d1c7b8",
                          background: r.featured ? "#fdfaf3" : "#fff",
                          color: r.featured ? "#aa8050" : "#4b4337",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        title={
                          r.featured
                            ? "Click to remove this review from the homepage"
                            : "Click to feature this review in the 'Voices of Connoisseurs' section on the homepage"
                        }
                      >
                        <Sparkles size={12} color={r.featured ? "#aa8050" : "#82796d"} />
                        <span>{r.featured ? "Featured on Home" : "Feature on Home"}</span>
                      </button>

                      {/* Status toggle button */}
                      {r.status !== "approved" ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => updateStatus(r, "approved")}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid #a7f3d0",
                            background: "#ecfdf5",
                            color: "#065f46",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={12} /> Approve
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => updateStatus(r, "rejected")}
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid #fed7aa",
                            background: "#fffaf0",
                            color: "#9a3412",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => deleteReview(r)}
                        style={{
                          fontSize: 11,
                          padding: "5px 8px",
                          borderRadius: 6,
                          border: "1px solid #fecaca",
                          background: "#fff",
                          color: "#dc2626",
                          cursor: "pointer",
                        }}
                        title="Delete review"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

