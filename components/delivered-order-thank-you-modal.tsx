"use client";

import { useState } from "react";
import { Check, CheckCircle2, Heart, PackageCheck, Sparkles, Star, X } from "lucide-react";

export type DeliveredModalOrder = {
  id: string;
  order_number: string;
  customer_name?: string;
  email?: string;
  status: string;
  shipping_address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  order_items: Array<{
    product_id?: string;
    product_slug?: string;
    product_name: string;
    size?: string;
    quantity?: number;
  }>;
};

const ratingHints: Record<number, string> = {
  5: "★★★★★ 5/5 — Extraordinary Masterpiece! Sillage & Longevity 12+ Hours",
  4: "★★★★☆ 4/5 — Wonderful Fragrance · Highly Recommended",
  3: "★★★☆☆ 3/5 — Pleasant Scent · Good Everyday Wear",
  2: "★★☆☆☆ 2/5 — Moderate Scent · Expected Stronger Projection",
  1: "★☆☆☆☆ 1/5 — Did Not Meet Expectations",
};

export default function DeliveredOrderThankYouModal({
  order,
  existingReviews = [],
  onClose,
  onReviewSubmitted,
}: {
  order: DeliveredModalOrder;
  existingReviews?: Array<{ order_id: string; product_name: string; rating: number; title: string; comment: string }>;
  onClose: () => void;
  onReviewSubmitted?: (review: any) => void;
}) {
  const items = order.order_items || [];
  const firstUnreviewed = items.find(
    (item) => !existingReviews.some((r) => r.order_id === order.id && r.product_name.toLowerCase() === item.product_name.toLowerCase())
  ) || items[0];

  const [selectedItem, setSelectedItem] = useState(firstUnreviewed || { product_name: "Flovexa Fragrance", size: "50 ml" });
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [location, setLocation] = useState(order.shipping_address?.city || "India");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeRating = hoverRating || rating;
  const customerFirstName = (order.customer_name || "Valued Patron").split(" ")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !comment.trim()) {
      setErrorMessage("Please enter both a title and your fragrance experience.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerEmail: order.email,
          productId: selectedItem.product_id,
          productSlug: selectedItem.product_slug,
          productName: selectedItem.product_name,
          rating,
          title: title.trim(),
          comment: comment.trim(),
          location: location.trim() || "India",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not publish your review. Please try again.");
      }

      // Mark as submitted locally so modal won't re-trigger
      try {
        localStorage.setItem(`flovexa_reviewed_order_${order.id}`, "true");
      } catch {}

      setSubmitted(true);
      if (onReviewSubmitted) {
        onReviewSubmitted(data.review);
      }
    } catch (err: any) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(18, 15, 12, 0.78)",
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          background: "#fcfaf7",
          border: "1px solid #ebd9bf",
          borderRadius: "8px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          position: "relative",
          animation: "flovexaFadeUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gold Accent Bar */}
        <div style={{ height: "4px", background: "linear-gradient(90deg, #aa8050, #e8c898, #aa8050)" }} />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "1px solid #e0d5c5",
            background: "#fff",
            color: "#6b5d4f",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {submitted ? (
          /* Thank You Celebration State */
          <div style={{ padding: "40px 28px", textAlign: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2d5a27, #3e7b36)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                boxShadow: "0 8px 20px rgba(45, 90, 39, 0.25)",
              }}
            >
              <CheckCircle2 size={34} />
            </div>

            <span
              style={{
                display: "inline-block",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8a6538",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Verified Patron Review Live
            </span>

            <h3
              style={{
                fontFamily: "var(--font-serif, 'Playfair Display', serif)",
                fontSize: "26px",
                color: "#1f1a14",
                margin: "0 0 12px",
                fontWeight: 400,
              }}
            >
              Thank You, {customerFirstName}!
            </h3>

            <p style={{ color: "#615546", fontSize: "14px", lineHeight: "1.6", margin: "0 auto 24px", maxWidth: "420px" }}>
              Your verified review for <strong>{selectedItem.product_name}</strong> has been published. It is now featured on the
              Flovexa official collection and homepage to guide other fragrance lovers.
            </p>

            <div
              style={{
                padding: "14px 18px",
                background: "#f4ede2",
                borderRadius: "6px",
                border: "1px solid #ebd9bf",
                marginBottom: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Sparkles size={18} color="#aa8050" />
              <span style={{ fontSize: "13px", color: "#6a4f29", fontWeight: 600 }}>
                ★ {rating}/5 Rating Credited to Your Order #{order.order_number}
              </span>
            </div>

            <div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "#aa8050",
                  color: "#fff",
                  border: "none",
                  padding: "12px 28px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                Close &amp; Continue
              </button>
            </div>
          </div>
        ) : (
          /* Rating & Review Form State */
          <div style={{ padding: "26px 26px 24px" }}>
            {/* Header / Thank You Intro */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  background: "#eaf3e6",
                  border: "1px solid #c8e0c0",
                  borderRadius: "20px",
                  fontSize: "11px",
                  color: "#275420",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                <PackageCheck size={13} color="#275420" /> Delivered via Shree Mahavir Courier
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Playfair Display', serif)",
                  fontSize: "24px",
                  color: "#1f1a14",
                  margin: "0 0 6px",
                  fontWeight: 400,
                }}
              >
                Thank You For Embracing Flovexa!
              </h2>

              <p style={{ color: "#6f6152", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>
                Order <strong>#{order.order_number}</strong> has safely reached you. How is your artisanal fragrance experience?
              </p>
            </div>

            {/* If order has multiple perfumes, let customer select */}
            {items.length > 1 && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#635546", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Select Perfume to Review:
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {items.map((item, idx) => {
                    const isSelected = selectedItem.product_name === item.product_name;
                    return (
                      <button
                        key={`${item.product_name}-${idx}`}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: isSelected ? "1px solid #aa8050" : "1px solid #dfd5c7",
                          background: isSelected ? "#f4ede2" : "#fff",
                          color: isSelected ? "#8a602d" : "#554a3e",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        {item.product_name} {item.size ? `(${item.size})` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Review Form */}
            <form onSubmit={handleSubmit}>
              {/* Star Rating */}
              <div style={{ marginBottom: "18px", textAlign: "center", background: "#f8f4ee", padding: "14px", borderRadius: "6px", border: "1px solid #ebe0d0" }}>
                <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#6a5742", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                  Your Rating for {selectedItem.product_name}
                </span>

                <div style={{ display: "inline-flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const filled = starVal <= activeRating;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "2px",
                          cursor: "pointer",
                          transform: filled ? "scale(1.08)" : "scale(1)",
                          transition: "transform 0.12s ease",
                        }}
                        aria-label={`${starVal} Star`}
                      >
                        <Star
                          size={28}
                          fill={filled ? "#e5b23d" : "transparent"}
                          color={filled ? "#e5b23d" : "#bfb29f"}
                          strokeWidth={1.75}
                        />
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: "6px", fontSize: "12px", color: "#8a6639", fontWeight: 600, minHeight: "18px" }}>
                  {ratingHints[activeRating] || "Select your rating"}
                </div>
              </div>

              {/* Headline */}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#544638", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Review Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mesmerizing drydown, lasted easily 12+ hours!"
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 12px",
                    fontSize: "13px",
                    border: "1px solid #dcd1c2",
                    borderRadius: "4px",
                    background: "#fff",
                    color: "#221d17",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Comment / Experience */}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#544638", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Scent Experience &amp; Compliments Received *
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about the sillage, projection, notes you smelled first, and compliments you received..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    border: "1px solid #dcd1c2",
                    borderRadius: "4px",
                    background: "#fff",
                    color: "#221d17",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* City / Location */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#544638", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  City / Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Surat, Mumbai, Delhi"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 12px",
                    fontSize: "12px",
                    border: "1px solid #dcd1c2",
                    borderRadius: "4px",
                    background: "#fff",
                    color: "#221d17",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {errorMessage && (
                <p style={{ color: "#a82b2b", fontSize: "12px", margin: "0 0 12px", fontWeight: 600 }}>
                  {errorMessage}
                </p>
              )}

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: "transparent",
                    color: "#776755",
                    border: "1px solid #d4c8b6",
                    padding: "9px 16px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Later
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "linear-gradient(135deg, #aa8050, #916838)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 22px",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 12px rgba(170, 128, 80, 0.3)",
                  }}
                >
                  <Sparkles size={14} />
                  {submitting ? "Publishing Review…" : "Publish Verified Review"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
