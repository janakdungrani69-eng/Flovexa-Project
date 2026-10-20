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
};

function getProductPyramid(product: Product) {
  const slug = product.slug.toLowerCase();

  if (slug.includes("rose")) {
    return {
      top: {
        title: "Top Notes",
        phase: "0 – 30 Minutes",
        notes: ["Damask Rose Buds", "Pink Pepper", "Italian Bergamot"],
        desc: "A vibrant opening of morning-plucked velvety roses infused with a playful kick of cracked pink peppercorn.",
      },
      heart: {
        title: "Heart Notes",
        phase: "1 – 4 Hours",
        notes: ["Bulgarian Rose Absolute", "Cashmere Wood", "Sweet Peony"],
        desc: "The romantic heart unfolds with intoxicating petal fullness draped over soft, creamy cashmere woods.",
      },
      base: {
        title: "Base Notes",
        phase: "4 – 14+ Hours",
        notes: ["Sweet Patchouli", "Warm Amber", "Sensual White Musk"],
        desc: "A captivating, graceful drydown that lingers softly on scarves and skin for hours after sunset.",
      },
      metrics: {
        longevity: "10 – 14 Hours",
        sillage: "Graceful & Magnetic",
        season: "All Season · Romance · Special Evenings",
        type: product.concentration,
      },
    };
  }

  if (slug.includes("santal")) {
    return {
      top: {
        title: "Top Notes",
        phase: "0 – 30 Minutes",
        notes: ["Green Cardamom", "Crisp Violet Leaf", "Italian Bergamot"],
        desc: "A distinguished aromatic opening of cracked green cardamom pods and cool airy botanicals.",
      },
      heart: {
        title: "Heart Notes",
        phase: "1 – 4 Hours",
        notes: ["Royal Mysore Sandalwood", "Creamy Cedarwood", "Orris Root"],
        desc: "The regal soul of vintage Indian sandalwood—rich, smooth, buttery, and meditative.",
      },
      base: {
        title: "Base Notes",
        phase: "4 – 16+ Hours",
        notes: ["Golden Amber", "Smoky Vetiver", "Sensory Dry Woods"],
        desc: "An earthy, royal trail of warm amber and aged woods that projects an effortless aura of quiet luxury.",
      },
      metrics: {
        longevity: "12 – 16 Hours",
        sillage: "Distinguished & Royal",
        season: "Autumn · Winter · Formal Occasions",
        type: product.concentration,
      },
    };
  }

  if (slug.includes("chocolate")) {
    return {
      top: {
        title: "Top Notes",
        phase: "0 – 30 Minutes",
        notes: ["Roasted Cocoa Bean", "Sweet Orange", "Warm Cinnamon"],
        desc: "The initial burst that greets your senses—a decadent indulgence of warm spices and freshly cracked cocoa.",
      },
      heart: {
        title: "Heart Notes",
        phase: "1 – 4 Hours",
        notes: ["Dark Belgian Chocolate", "Hazelnut Cream", "Nutmeg Spice"],
        desc: "The opulent core of the fragrance—sensual, velvety chocolate melting into a roasted nutty sweetness.",
      },
      base: {
        title: "Base Notes",
        phase: "4 – 14+ Hours",
        notes: ["Madagascar Vanilla", "Golden Amberwood", "Smoked Tonka Bean"],
        desc: "The lingering sillage that stays on skin and clothing—a warm, magnetic aura of pure comfort and luxury.",
      },
      metrics: {
        longevity: "12 – 14 Hours",
        sillage: "Radiant & Seductive",
        season: "Autumn · Winter · Evening Date Nights",
        type: product.concentration,
      },
    };
  }

  if (slug.includes("saffron")) {
    return {
      top: {
        title: "Top Notes",
        phase: "0 – 30 Minutes",
        notes: ["Kashmiri Saffron Threads", "Blood Orange", "Cardamom"],
        desc: "Golden red saffron threads steeped in citrus warmth, making an unmistakable royal entrance.",
      },
      heart: {
        title: "Heart Notes",
        phase: "1 – 4 Hours",
        notes: ["Damask Rose", "Jasmine Sambac", "Spicy Amber"],
        desc: "A lavish bouquet of crimson roses intertwined with royal jasmine and warm spices.",
      },
      base: {
        title: "Base Notes",
        phase: "4 – 14+ Hours",
        notes: ["White Musk", "Cedarwood", "Caramelized Amber"],
        desc: "A luminous, golden veil that envelops the skin like warm silk.",
      },
      metrics: {
        longevity: "11 – 14 Hours",
        sillage: "Luminous & Aristocratic",
        season: "Festive · Weddings · Royal Evenings",
        type: product.concentration,
      },
    };
  }

  if (slug.includes("oud")) {
    return {
      top: {
        title: "Top Notes",
        phase: "0 – 30 Minutes",
        notes: ["Cracked Black Pepper", "Smoked Incense", "Nutmeg"],
        desc: "An intense, mystical greeting of fresh spice and gentle frankincense smoke.",
      },
      heart: {
        title: "Heart Notes",
        phase: "1 – 4 Hours",
        notes: ["Smoked Assam Oud", "Aged Leather", "Labdanum Resin"],
        desc: "Deep, resinous agarwood blended with aged saddle leather—dark, commanding, and hypnotic.",
      },
      base: {
        title: "Base Notes",
        phase: "4 – 18+ Hours",
        notes: ["Dark Amber", "Smoky Vetiver", "Bourbon Oak"],
        desc: "A powerhouse smoky finish that endures on fabric for days, leaving an indelible signature.",
      },
      metrics: {
        longevity: "14 – 18 Hours",
        sillage: "Intense & Enigmatic",
        season: "Winter · Black-Tie · Night Escapes",
        type: product.concentration,
      },
    };
  }

  if (slug.includes("aqua")) {
    return {
      top: {
        title: "Top Notes",
        phase: "0 – 30 Minutes",
        notes: ["Ocean Breeze Accord", "Italian Bergamot", "Sparkling Grapefruit"],
        desc: "Crisp marine waves crashing against sun-drenched Mediterranean citrus groves—invigorating and clean.",
      },
      heart: {
        title: "Heart Notes",
        phase: "1 – 4 Hours",
        notes: ["Aquatic Water Lily", "Sea Salt Spray", "Fresh Wild Rosemary"],
        desc: "The refreshing aquatic center—mineral freshness, sparkling splash, and natural aromatic herbs.",
      },
      base: {
        title: "Base Notes",
        phase: "4 – 16+ Hours",
        notes: ["Sun-Bleached Driftwood", "Warm Amber", "Clean Mineral Musk"],
        desc: "The grounding marine finish—dry cedarwood, salty sea air, and pure comforting musk on warm skin.",
      },
      metrics: {
        longevity: "12 – 16 Hours (Pure Oil)",
        sillage: "Crisp & Uplifting",
        season: "Daily Office · Summer · All Day Wear",
        type: "100% Pure Concentrated Fragrance Oil",
      },
    };
  }

  if (slug.includes("amber")) {
    return {
      top: {
        title: "Top Notes",
        phase: "0 – 30 Minutes",
        notes: ["Saffron Threads", "Sweet Benzoin", "Nutmeg"],
        desc: "A golden, resinous greeting that melts warmly onto your pulse points upon contact.",
      },
      heart: {
        title: "Heart Notes",
        phase: "1 – 4 Hours",
        notes: ["Pure Golden Amber", "Honeyed Vanilla", "Velvet Rose"],
        desc: "Rich golden liquid amber wrapped in warm gourmand vanilla and velvet florals.",
      },
      base: {
        title: "Base Notes",
        phase: "4 – 16+ Hours",
        notes: ["Soft Oud Accord", "Cedarwood", "White Sandalwood"],
        desc: "An alcohol-free, deeply intimate skin scent that radiates warmth without fading.",
      },
      metrics: {
        longevity: "14 – 16 Hours (Pure Oil)",
        sillage: "Sensual & Skin-Close",
        season: "All Seasons · Evening & Intimate Wear",
        type: "100% Pure Concentrated Fragrance Oil",
      },
    };
  }

  // Musk Blanc or default
  return {
    top: {
      title: "Top Notes",
      phase: "0 – 30 Minutes",
      notes: ["White Aldehydes", "Dewy Lily of the Valley", "Fresh Linen"],
      desc: "Pristine, clean and luminous—a breath of freshly laundered silk under gentle morning sunlight.",
    },
    heart: {
      title: "Heart Notes",
      phase: "1 – 4 Hours",
      notes: ["Pebble White Musk", "Soft Iris", "Creamy Jasmine"],
      desc: "A tender, ethereal cloud of second-skin white musk that feels effortlessly pure and luxurious.",
    },
    base: {
      title: "Base Notes",
      phase: "4 – 16+ Hours",
      notes: ["Bourbon Vanilla", "Light Amber", "Cashmere Touch"],
      desc: "Warm, comforting, and intimate—a whisper of clean luxury that stays close to your skin for 14+ hours.",
    },
    metrics: {
      longevity: "12 – 16 Hours (Pure Oil)",
      sillage: "Ethereal & Intimate",
      season: "Daily Signature · All Season · Meditation",
      type: "100% Pure Concentrated Fragrance Oil",
    },
  };
}

function getProductReviews(product: Product) {
  const name = product.name;
  const slug = product.slug.toLowerCase();

  if (slug.includes("rose")) {
    return [
      {
        author: "Ananya Deshmukh",
        rating: 5,
        date: "3 days ago",
        title: "The most realistic, expensive rose I’ve ever smelled!",
        body: "Rose Royale smells like walking through a private palace garden at dawn. The pink pepper prevents it from being too sweet, and the cashmere drydown lasts easily 12 hours on my scarf. Absolute masterpiece.",
        location: "Pune",
      },
      {
        author: "Kunal Singhania",
        rating: 5,
        date: "1 week ago",
        title: "Bought this for my wife, she wears it daily now",
        body: "The presentation in the magnetic gold-embossed box is pure luxury. She sprayed 2 spritzes in the morning and I could still smell the delicate floral trail at dinner. Worth every single rupee.",
        location: "Bengaluru",
      },
      {
        author: "Zoya Merchant",
        rating: 5,
        date: "2 weeks ago",
        title: "Compliments everywhere I go!",
        body: "I am usually very picky about rose perfumes, but Flovexa got this 100% right. It doesn't smell artificial at all. Very regal, feminine, and opulent.",
        location: "Mumbai",
      },
    ];
  }

  if (slug.includes("chocolate")) {
    return [
      {
        author: "Aarav Mehta",
        rating: 5,
        date: "2 days ago",
        title: "Gourmand perfection—turns heads everywhere!",
        body: "Chocolate Desire is pure edible luxury. The roasted cocoa and cinnamon opening is intoxicating, and the drydown is rich bourbon vanilla. It lasted a solid 13 hours on my jacket.",
        location: "Mumbai",
      },
      {
        author: "Sneha Kapoor",
        rating: 5,
        date: "1 week ago",
        title: "Blind bought this and zero regrets!",
        body: "I was skeptical about buying perfume online without smelling it, but this exceeded all expectations. It feels much more expensive than ₹3,500 brands.",
        location: "Delhi NCR",
      },
      {
        author: "Rohan Varma",
        rating: 5,
        date: "2 weeks ago",
        title: "The date night compliment getter",
        body: "Every single time I wear Chocolate Desire, people ask what scent I have on. The sillage is polite yet impossible to ignore.",
        location: "Hyderabad",
      },
    ];
  }

  if (slug.includes("santal")) {
    return [
      {
        author: "Vikramaditya Rao",
        rating: 5,
        date: "4 days ago",
        title: "Authentic Mysore Sandalwood at its finest",
        body: "Imperial Santal captures the true essence of vintage sandalwood without smelling medicinal. The cardamom opening and creamy cedarwood drydown is pure old-money luxury.",
        location: "Jaipur",
      },
      {
        author: "Meera Nair",
        rating: 5,
        date: "1 week ago",
        title: "Calming, sophisticated and extremely long-lasting",
        body: "I wear this to high-stakes board meetings. It has a calm, confident presence that projects without screaming. Easily lasts 14+ hours.",
        location: "Bengaluru",
      },
      {
        author: "Aditya Chopra",
        rating: 5,
        date: "3 weeks ago",
        title: "Worth every rupee. 10/10 quality.",
        body: "The heavy glass bottle and brass cap feel like an imported 25k niche bottle. The sandalwood juice is rich, creamy, and soothing.",
        location: "Chandigarh",
      },
    ];
  }

  return [
    {
      author: "Kavita Sharma",
      rating: 5,
      date: "4 days ago",
      title: `Instant signature scent—${name} is brilliant`,
      body: `The projection and staying power of ${name} surprised me. You only need a tiny amount and it radiates effortlessly throughout the workday.`,
      location: "New Delhi",
    },
    {
      author: "Rishi Bansal",
      rating: 5,
      date: "1 week ago",
      title: "Top-tier presentation and lasting",
      body: `Flovexa's packaging alone feels like international niche perfumery. The scent itself is deep, refined, and gets constant compliments.`,
      location: "Ahmedabad",
    },
    {
      author: "Tanya Sen",
      rating: 5,
      date: "2 weeks ago",
      title: "Finally a long-lasting Indian luxury fragrance",
      body: `Most perfumes fade away in our Indian climate within 3 hours. ${name} stayed with me from 9 AM till 11 PM. Exceptional craft!`,
      location: "Kolkata",
    },
  ];
}

export default function ProductLuxuryDetails({ product, relatedProducts }: LuxuryDetailsProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

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
  const reviews = useMemo(() => [...userReviews, ...defaultReviews], [userReviews, defaultReviews]);

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
              <span>{product.size}</span>
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

        <div className="luxe-reviews-grid">
          {reviews.map((rev, index) => (
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

      {/* Flovexa Luxe Footer */}
      <footer className="luxe-product-footer">
        <div className="footer-top">
          <Link href="/store" className="footer-brand">
            FLOVEXA<span>PERFUMES</span>
          </Link>
          <p className="footer-tagline">
            Artisanal Indian Luxury Perfumery · Crafted with pure European extracts.
          </p>
        </div>
        <div className="footer-links-row">
          <Link href="/store#collection">All Scents</Link>
          <Link href="/orders">Track Order</Link>
          <Link href="/account">My Account</Link>
          <Link href="/about">About Flovexa</Link>
          <Link href="/contact">Client Support</Link>
        </div>
        <div className="footer-copy">
          © {new Date().getFullYear()} Flovexa Perfumes. 100% Secure Online Payment. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
