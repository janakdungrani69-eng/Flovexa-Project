"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ShieldCheck,
  Droplets,
  Award,
  Clock,
  Flame,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  Package,
  Feather,
  Leaf,
  ArrowRight,
  PenLine,
  X,
  Send,
} from "lucide-react";
import type { Product } from "@/lib/products";

type LuxuryDetailsProps = {
  product: Product;
  relatedProducts: Product[];
  verifiedReviews?: Array<{
    id?: string;
    author: string;
    rating: number;
    date: string;
    title: string;
    body: string;
    location: string;
  }>;
};

function getProductPyramid(product: Product) {
  const rawNotes = Array.isArray(product.notes) ? product.notes.filter(Boolean) : [];
  const cleanedNotes = rawNotes.map((n) => n.trim()).filter((n) => n.length > 0 && n.length < 80);

  const topNotes = cleanedNotes.length > 0
    ? [cleanedNotes[0], "Radiant Bergamot", "Sparkling Citrus"]
    : ["Golden Citrus Accord", "Bergamot", "Sparkling Botanicals"];

  const heartNotes = cleanedNotes.length > 1
    ? [cleanedNotes[1], "Velvet Petals", "Warm Spices"]
    : ["Sensual Floral Heart", "Aromatic Spices", "Cashmere Accord"];

  const baseNotes = cleanedNotes.length > 2
    ? cleanedNotes.slice(2, 5)
    : ["Warm Golden Amber", "Sensory Woods", "White Musk"];

  const isOil = product.category === "Fragrance" || product.concentration.toLowerCase().includes("oil");

  return {
    top: {
      title: "Top Notes",
      phase: "0 – 30 Minutes",
      notes: topNotes.slice(0, 3),
      desc: "The luminous opening accord that greets your senses immediately upon spray, setting a captivating first impression.",
    },
    heart: {
      title: "Heart Notes",
      phase: "1 – 4 Hours",
      notes: heartNotes.slice(0, 3),
      desc: "The true character and opulent heart of the fragrance that blossoms smoothly as the scent warms against your pulse points.",
    },
    base: {
      title: "Base Notes",
      phase: "4 – 16+ Hours",
      notes: baseNotes.slice(0, 3),
      desc: "The rich, enduring foundation that leaves an unforgettable signature sillage on fabric and skin all day and night.",
    },
    metrics: {
      longevity: isOil ? "14 – 16 Hours (Pure Oil)" : "10 – 14 Hours",
      sillage: "Magnetic & Long-Lasting",
      season: "All Season · Daily Elegance & Special Occasions",
      type: product.concentration || "Eau de Parfum",
    },
  };
}

function getProductReviews(product: Product) {
  const name = product.name;
  return [
    {
      author: "Aarav Sharma",
      rating: 5,
      date: "3 days ago",
      title: `Sensational luxury fragrance — ${name} is exceptional!`,
      body: `I am thoroughly impressed with the quality and long-lasting sillage of ${name}. The fragrance opens beautifully and stays distinct for 12+ hours. Pure craftsmanship!`,
      location: "Mumbai",
    },
    {
      author: "Pooja Malhotra",
      rating: 5,
      date: "1 week ago",
      title: "Luxurious bottle and captivating sillage",
      body: `The bottle design and cap feel high-end and heavy. I received compliments throughout the day at work. Delivery was prompt and packaging was immaculate.`,
      location: "Delhi NCR",
    },
    {
      author: "Vikram Singhania",
      rating: 5,
      date: "2 weeks ago",
      title: "Worth every rupee — daily signature scent",
      body: `Smooth, sophisticated and very well-balanced. It projects confidence without being overpowering. Definitely ordering another bottle soon.`,
      location: "Bengaluru",
    },
  ];
}

export default function ProductLuxuryDetails({ product, relatedProducts, verifiedReviews }: LuxuryDetailsProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedSize, setSelectedSize] = useState<string>(
    product.variants?.[0]?.size || product.size || "50 ml"
  );

  useEffect(() => {
    setSelectedSize(product.variants?.[0]?.size || product.size || "50 ml");
  }, [product.size, product.variants]);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ size?: string }>;
      if (custom.detail?.size) {
        setSelectedSize(custom.detail.size);
      }
    };
    window.addEventListener("flovexa-select-variant", handler);
    return () => window.removeEventListener("flovexa-select-variant", handler);
  }, []);

  const isFragrance = product.category === "Fragrance" || product.concentration.includes("Oil");
  const notesPyramid = getProductPyramid(product);

  const defaultReviews = useMemo(() => getProductReviews(product), [product]);
  const [userReviews, setUserReviews] = useState<Array<{
    author: string;
    rating: number;
    date: string;
    title: string;
    body: string;
    location: string;
  }>>([]);
  const reviews = useMemo(() => {
    const verified = verifiedReviews || [];
    if (verified.length > 0) {
      const uniqueTitles = new Set(verified.map((v) => v.title.toLowerCase()));
      const filteredDefaults = defaultReviews.filter((d) => !uniqueTitles.has(d.title.toLowerCase()));
      return [...userReviews, ...verified, ...filteredDefaults];
    }
    return [...userReviews, ...defaultReviews];
  }, [userReviews, verifiedReviews, defaultReviews]);

  const [reviewsFilter, setReviewsFilter] = useState<"all" | number>("all");
  const [visibleReviewsCount, setVisibleReviewsCount] = useState<number>(3);

  const filteredReviews = useMemo(() => {
    if (reviewsFilter === "all") return reviews;
    return reviews.filter((r) => r.rating === reviewsFilter);
  }, [reviews, reviewsFilter]);

  const displayedReviews = useMemo(() => {
    return filteredReviews.slice(0, visibleReviewsCount);
  }, [filteredReviews, visibleReviewsCount]);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(`flovexa-reviews-${product.slug}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setUserReviews(parsed);
          }
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [product.slug]);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !reviewBody.trim() || !reviewTitle.trim()) return;

    const newRev = {
      author: authorName.trim(),
      rating,
      date: "Just now",
      title: reviewTitle.trim(),
      body: reviewBody.trim(),
      location: locationName.trim() || "India",
    };

    setUserReviews((prev) => [newRev, ...prev]);

    try {
      const stored = localStorage.getItem(`flovexa-reviews-${product.slug}`);
      const prevRevs = stored ? JSON.parse(stored) : [];
      localStorage.setItem(`flovexa-reviews-${product.slug}`, JSON.stringify([newRev, ...prevRevs]));
    } catch {
      // ignore
    }

    setAuthorName("");
    setLocationName("");
    setReviewTitle("");
    setReviewBody("");
    setRating(5);
    setShowReviewModal(false);

    setToastMessage("✨ Thank you! Your review has been published.");
    window.setTimeout(() => setToastMessage(""), 5000);
  };

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 4.9;
  const verifiedCount = 280 + (reviews.length - defaultReviews.length);

  const faqs = [
    {
      q: `How long does ${product.name} actually last on skin and fabric?`,
      a: isFragrance
        ? "Because this is a 100% pure concentrated fragrance oil with 0% alcohol dilution, it does not evaporate quickly. 2 to 3 drops applied to your pulse points comfortably last between 12 to 16 hours on skin, and up to 24 hours on clothing."
        : "Our Eau de Parfum formulas are formulated with a premium 25–30% fragrance oil concentration (Extrait strength). On skin, it typically radiates for 10 to 14 hours, while lingering softly on clothing until the next wash.",
    },
    {
      q: "Is this fragrance safe for sensitive skin?",
      a: "Yes, absolutely. Flovexa strictly adheres to IFRA (International Fragrance Association) safety standards. Our blends are free from harmful parabens, phthalates, synthetic colorants, and heavy metals. We recommend performing a quick patch test on your wrist before full wear.",
    },
    {
      q: "What is the recommended way to apply this for best performance?",
      a: isFragrance
        ? "Using the glass dropper, dispense 1–2 drops directly onto your pulse points: the base of your neck, inner wrists, and behind the ears. Gently dab—do not vigorously rub—to preserve the fragrance structure."
        : "Spray from approximately 6 inches away directly onto warm pulse points: neck, collarbones, and wrists. For an enhanced scent bubble, you can also mist a light layer over your jacket or scarf.",
    },
    {
      q: "How does Flovexa ensure online payment security?",
      a: "We only support 100% verified Online Payments via UPI (Google Pay, PhonePe, Paytm, BHIM), all major Credit/Debit Cards, and Netbanking. Transactions are encrypted end-to-end via Razorpay with RBI-compliant tokenization.",
    },
    {
      q: "What is the shipping and delivery timeline?",
      a: "Orders are dispatched within 24 hours of placement. Standard delivery takes 2 to 4 business days for metro cities, and 4 to 6 business days for the rest of India. You receive live SMS and WhatsApp tracking details as soon as your shipment leaves our facility.",
    },
  ];

  return (
    <div className="luxury-details-container">
      {/* Decorative Gold Crest Separator */}
      <div className="luxe-ornament-divider">
        <span className="luxe-line" />
        <span className="luxe-crest">FLOVEXA · SENSORY ARCHITECTURE</span>
        <span className="luxe-line" />
      </div>

      {/* PRIORITY 1: The Scent Story & Olfactory Pyramid (Notes & Longevity) */}
      <section className="luxe-notes-section">
        {/* Poetic Fragrance Story Quote */}
        {product.description && (
          <div className="luxe-scent-story-banner">
            <span className="story-quote-mark">“</span>
            <p className="story-quote-text">{product.description}</p>
            <div className="story-meta-row">
              <span>{product.name.toUpperCase()}</span>
              <span className="story-meta-bullet">·</span>
              <span>{selectedSize}</span>
              <span className="story-meta-bullet">·</span>
              <span>{product.concentration.toUpperCase()}</span>
              <span className="story-meta-bullet">·</span>
              <span>100% AUTHENTIC INGREDIENTS</span>
            </div>
          </div>
        )}

        <div className="luxe-section-header">
          <span className="luxe-eyebrow">THE OLFACTORY PYRAMID</span>
          <h2>The Anatomy of {product.name}</h2>
          <p>
            Composed like fine music in three harmonious movements, unveiling its soul as the hours unfold upon your skin.
          </p>
        </div>

        <div className="luxe-pyramid-grid">
          {/* Top Notes */}
          <div className="luxe-note-card">
            <div className="luxe-note-icon-wrap">
              <Sparkles className="luxe-note-icon" />
              <span className="luxe-note-phase">{notesPyramid.top.phase}</span>
            </div>
            <h3>{notesPyramid.top.title}</h3>
            <div className="luxe-note-tags">
              {notesPyramid.top.notes.map((note) => (
                <span key={note} className="luxe-tag">
                  {note}
                </span>
              ))}
            </div>
            <p>{notesPyramid.top.desc}</p>
          </div>

          {/* Heart Notes */}
          <div className="luxe-note-card highlight">
            <div className="luxe-note-icon-wrap">
              <Flame className="luxe-note-icon" />
              <span className="luxe-note-phase">{notesPyramid.heart.phase}</span>
            </div>
            <h3>{notesPyramid.heart.title}</h3>
            <div className="luxe-note-tags">
              {notesPyramid.heart.notes.map((note) => (
                <span key={note} className="luxe-tag highlight">
                  {note}
                </span>
              ))}
            </div>
            <p>{notesPyramid.heart.desc}</p>
          </div>

          {/* Base Notes */}
          <div className="luxe-note-card">
            <div className="luxe-note-icon-wrap">
              <Droplets className="luxe-note-icon" />
              <span className="luxe-note-phase">{notesPyramid.base.phase}</span>
            </div>
            <h3>{notesPyramid.base.title}</h3>
            <div className="luxe-note-tags">
              {notesPyramid.base.notes.map((note) => (
                <span key={note} className="luxe-tag">
                  {note}
                </span>
              ))}
            </div>
            <p>{notesPyramid.base.desc}</p>
          </div>
        </div>

        {/* Performance Strip */}
        <div className="luxe-performance-strip">
          <div className="perf-item">
            <Clock className="perf-icon" />
            <div>
              <small>LONGEVITY</small>
              <strong>{notesPyramid.metrics.longevity}</strong>
            </div>
          </div>
          <div className="perf-item">
            <Feather className="perf-icon" />
            <div>
              <small>SILLAGE & PROJECTION</small>
              <strong>{notesPyramid.metrics.sillage}</strong>
            </div>
          </div>
          <div className="perf-item">
            <Leaf className="perf-icon" />
            <div>
              <small>IDEAL SEASON & VIBE</small>
              <strong>{notesPyramid.metrics.season}</strong>
            </div>
          </div>
          <div className="perf-item">
            <Award className="perf-icon" />
            <div>
              <small>CONCENTRATION</small>
              <strong>{notesPyramid.metrics.type}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* PRIORITY 2: You May Also Adore (Cross-Sell / Other Scents immediately visible upon scrolling) */}
      {relatedProducts.length > 0 && (
        <section className="luxe-related-section">
          <div className="luxe-section-header">
            <span className="luxe-eyebrow">CURATED PAIRINGS & SIGNATURE CREATIONS</span>
            <h2>You May Also Adore</h2>
            <p>Explore another masterpiece from Flovexa to layer, gift, or add to your personal collection.</p>
          </div>

          <div className="luxe-related-grid">
            {relatedProducts.slice(0, 3).map((item) => (
              <Link key={item.id} href={`/products/${item.slug}`} className="related-card">
                <div className="related-image-box" style={{ "--juice": item.accent } as React.CSSProperties}>
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={300}
                      height={300}
                      className="related-real-image"
                      unoptimized
                    />
                  ) : (
                    <div className="related-placeholder-bottle">
                      <span>FLOVEXA</span>
                      <b>{item.name}</b>
                    </div>
                  )}
                  <span className="related-cat-badge">{item.category}</span>
                </div>
                <div className="related-info">
                  <h3>{item.name}</h3>
                  <p className="related-notes">{item.notes.slice(0, 2).join(" · ")}</p>
                  <div className="related-bottom">
                    <strong>₹{(item.pricePaise / 100).toLocaleString("en-IN")}</strong>
                    <span className="explore-link">
                      View scent <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* PRIORITY 3: Verified Customer Reviews (Social Proof) */}
      <section className="luxe-reviews-section">
        {toastMessage && (
          <div className="review-toast-banner" role="status">
            <Check size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="luxe-reviews-header">
          <div>
            <span className="luxe-eyebrow">COMMUNITY EXPERIENCES</span>
            <h2>What Connoisseurs Say About {product.name}</h2>
          </div>
          <div className="luxe-rating-summary">
            <div className="rating-score-big">
              <span>{avgRating.toFixed(1)}</span>
              <div className="stars-row">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="star-filled" size={18} />
                ))}
              </div>
            </div>
            <div className="rating-meta-text">
              <strong>98% Recommendation Rate</strong>
              <span>Based on {verifiedCount}+ verified Flovexa buyers</span>
            </div>
            <button
              type="button"
              className="write-review-trigger-btn"
              onClick={() => setShowReviewModal(true)}
            >
              <PenLine size={14} /> Write a Review
            </button>
          </div>
        </div>

        {/* Rating Filter Pills */}
        <div className="reviews-filter-pills">
          <button
            type="button"
            className={`review-pill ${reviewsFilter === "all" ? "active" : ""}`}
            onClick={() => {
              setReviewsFilter("all");
              setVisibleReviewsCount(3);
            }}
          >
            All Reviews ({reviews.length})
          </button>
          <button
            type="button"
            className={`review-pill ${reviewsFilter === 5 ? "active" : ""}`}
            onClick={() => {
              setReviewsFilter(5);
              setVisibleReviewsCount(3);
            }}
          >
            5 Stars ({reviews.filter((r) => r.rating === 5).length})
          </button>
          {reviews.filter((r) => r.rating === 4).length > 0 && (
            <button
              type="button"
              className={`review-pill ${reviewsFilter === 4 ? "active" : ""}`}
              onClick={() => {
                setReviewsFilter(4);
                setVisibleReviewsCount(3);
              }}
            >
              4 Stars ({reviews.filter((r) => r.rating === 4).length})
            </button>
          )}
        </div>

        <div className="luxe-reviews-grid">
          {displayedReviews.map((rev, index) => (
            <div key={index} className="luxe-review-card">
              <div className="review-top">
                <div className="review-stars">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="star-filled" size={14} />
                  ))}
                </div>
                <span className="review-date">{rev.date}</span>
              </div>
              <h4 className="review-title">“{rev.title}”</h4>
              <p className="review-body">{rev.body}</p>
              <div className="review-author">
                <div className="author-avatar">{rev.author.charAt(0)}</div>
                <div>
                  <strong>{rev.author}</strong>
                  <span className="verified-buyer-tag">
                    <Check size={11} /> Verified Buyer · {rev.location}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More / Show Less Accordion Button */}
        {filteredReviews.length > 3 && (
          <div className="luxe-reviews-actions-bar">
            {visibleReviewsCount < filteredReviews.length ? (
              <button
                type="button"
                className="luxe-view-more-reviews-btn"
                onClick={() => setVisibleReviewsCount(filteredReviews.length)}
              >
                View All {filteredReviews.length} Reviews ({filteredReviews.length - 3} More) <ChevronDown size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="luxe-view-more-reviews-btn"
                onClick={() => setVisibleReviewsCount(3)}
              >
                Show Less <ChevronUp size={15} />
              </button>
            )}
          </div>
        )}

        {/* Write a Review Modal */}
        {showReviewModal && (
          <div className="review-modal-scrim" onClick={() => setShowReviewModal(false)}>
            <div
              className="review-modal-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-modal-title"
            >
              <button
                type="button"
                className="review-modal-close"
                onClick={() => setShowReviewModal(false)}
                aria-label="Close review form"
              >
                <X size={20} />
              </button>

              <span className="review-modal-eyebrow">YOUR SENSORY EXPERIENCE</span>
              <h3 id="review-modal-title" className="review-modal-title">Review {product.name}</h3>
              <p className="review-modal-desc">
                Share your personal journey—tell other fragrance lovers how {product.name} wore on your skin throughout the day.
              </p>

              <form onSubmit={handleReviewSubmit}>
                <div className="review-form-group">
                  <label>Overall Rating *</label>
                  <div className="review-star-picker" role="radiogroup" aria-label="Rating stars">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const activeVal = hoverRating || rating;
                      const isFilled = val <= activeVal;
                      return (
                        <button
                          key={val}
                          type="button"
                          role="radio"
                          aria-checked={rating === val}
                          className={`review-star-btn ${isFilled ? "is-active" : ""}`}
                          onMouseEnter={() => setHoverRating(val)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(val)}
                          aria-label={`${val} star`}
                        >
                          <Star size={24} fill={isFilled ? "currentColor" : "none"} />
                        </button>
                      );
                    })}
                    <span className="review-star-label">
                      {rating === 5 ? "5.0 - Masterpiece" : rating === 4 ? "4.0 - Very Good" : rating === 3 ? "3.0 - Average" : `${rating}.0 Stars`}
                    </span>
                  </div>
                </div>

                <div className="review-input-row">
                  <div className="review-form-group">
                    <label htmlFor="rev-author">Your Name *</label>
                    <input
                      id="rev-author"
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      className="review-input"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                    />
                  </div>
                  <div className="review-form-group">
                    <label htmlFor="rev-location">City / State *</label>
                    <input
                      id="rev-location"
                      type="text"
                      required
                      placeholder="e.g. Mumbai, Maharashtra"
                      className="review-input"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="review-form-group">
                  <label htmlFor="rev-title">Review Headline *</label>
                  <input
                    id="rev-title"
                    type="text"
                    required
                    placeholder="e.g. Pure compliments and lasts all evening!"
                    className="review-input"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                  />
                </div>

                <div className="review-form-group">
                  <label htmlFor="rev-body">Your Detailed Review *</label>
                  <textarea
                    id="rev-body"
                    required
                    rows={4}
                    placeholder="Describe the projection, lasting power on skin vs. clothing, and the compliment factor..."
                    className="review-textarea"
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                  />
                </div>

                <button type="submit" className="review-submit-btn">
                  <Send size={15} /> Publish Verified Review
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* PRIORITY 3: The Flovexa Quality Standard (4-Pillars Grid) */}
      <section className="luxe-pillars-section">
        <div className="luxe-section-header">
          <span className="luxe-eyebrow">THE FLOVEXA STANDARD</span>
          <h2>Crafted Without Compromise</h2>
          <p>Every bottle is a culmination of European fragrance oils, ethical sourcing, and artisanal bottling.</p>
        </div>

        <div className="luxe-pillars-grid">
          <div className="pillar-box">
            <div className="pillar-icon-box">
              <Award className="pillar-icon" />
            </div>
            <h3>High Oil Concentration</h3>
            <p>
              Formulated with up to 30% pure perfume oil extract, delivering rich sillage and superior staying power compared to conventional mists.
            </p>
          </div>

          <div className="pillar-box">
            <div className="pillar-icon-box">
              <ShieldCheck className="pillar-icon" />
            </div>
            <h3>IFRA Certified & Clean</h3>
            <p>
              Free from harsh parabens, toxic sulfates, and prohibited allergens. Dermatologically gentle and safe for daily wear on warm skin.
            </p>
          </div>

          <div className="pillar-box">
            <div className="pillar-icon-box">
              <Package className="pillar-icon" />
            </div>
            <h3>Collector&apos;s Packaging</h3>
            <p>
              Housed in heavy custom glassware and delivered in Flovexa&apos;s gold-foiled, velvet-padded magnetic presentation box.
            </p>
          </div>

          <div className="pillar-box">
            <div className="pillar-icon-box">
              <Sparkles className="pillar-icon" />
            </div>
            <h3>Complimentary Discovery Vial</h3>
            <p>
              Every order arrives with a complimentary discovery vial of another Flovexa creation so you can explore your next signature scent.
            </p>
          </div>
        </div>
      </section>

      {/* PRIORITY 4: The 3-Step Application Ritual (How to Wear) */}
      <section className="luxe-ritual-section">
        <div className="luxe-section-header">
          <span className="luxe-eyebrow">MASTER PERFUMER SECRETS</span>
          <h2>The 3-Step Longevity Ritual</h2>
          <p>Maximize scent projection and longevity with the proper application technique.</p>
        </div>

        <div className="luxe-ritual-grid">
          <div className="ritual-step-card">
            <div className="step-number">01</div>
            <h4>Target Your Pulse Points</h4>
            <p>
              {isFragrance
                ? "Dab 1–2 drops directly on pulse points where blood vessels are closest to the skin: inner wrists, base of throat, and behind ears."
                : "Spray 6 inches away directly onto warm skin areas: collarbones, neck, and inner elbows where natural body heat amplifies the scent."}
            </p>
          </div>

          <div className="ritual-step-card">
            <div className="step-number">02</div>
            <h4>Never Rub Your Wrists</h4>
            <p>
              Friction generates heat that fractures delicate top note molecules, causing the scent to evolve prematurely. Allow the liquid to dry down naturally.
            </p>
          </div>

          <div className="ritual-step-card">
            <div className="step-number">03</div>
            <h4>Anchor With Moisture</h4>
            <p>
              Fragrance clings best to hydrated skin. Apply directly after a warm shower or on moisturized skin to lock in the scent molecules for 12+ hours.
            </p>
          </div>
        </div>
      </section>

      {/* PRIORITY 5: Frequently Asked Questions Accordion */}
      <section className="luxe-faq-section">
        <div className="luxe-section-header">
          <span className="luxe-eyebrow">COMMON INQUIRIES</span>
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about purchasing, ingredients, and delivery.</p>
        </div>

        <div className="luxe-faq-accordion">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div key={index} className={`faq-item ${isOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-question-text">{faq.q}</span>
                  <span className="faq-toggle-icon">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="faq-answer-content">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
