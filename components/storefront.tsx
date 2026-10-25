"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, Check, ChevronDown, Mail, MapPin, Menu, Minus, Package, Phone, Plus, Search, ShoppingBag, Sparkles, Star, X } from "lucide-react";
import type { Product } from "@/lib/products";
import WishlistButton from "@/components/wishlist-button";
import type { StorefrontSettings } from "@/lib/storefront-content";
import StoryExperienceCard from "@/components/story-experience-card";

export type FeaturedStoreReview = {
  id?: string;
  author: string;
  city: string;
  product: string;
  productSlug?: string;
  quote: string;
  rating: number;
  date?: string;
};

type CartItem = { productId: string; quantity: number };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export function BottleArt({ product, hero = false }: { product: Product; hero?: boolean }) {
  return (
    <div className={`bottle-art${hero ? " bottle-art--hero" : ""}${product.imageUrl ? " bottle-art--has-image" : ""}`} style={{ "--juice": product.accent } as React.CSSProperties} aria-label={`${product.name} perfume bottle`}>
      {product.imageUrl ? (
        <Image className="product-real-image" src={product.imageUrl} alt={product.name} width={800} height={800} priority={hero} unoptimized />
      ) : (
        <>
      <span className="art-index" style={hero ? undefined : { left: "auto", right: 14, top: 14 }}>{hero ? "F · 01" : product.concentration}</span>
      <span className="bottle-glow" />
      <span className="bottle-shape"><span className="bottle-neck" /><span className="bottle-cap" /><span className="bottle-label"><b>FLOVEXA</b><small>{product.name}</small><i>{product.size}</i></span></span>
      <span className="art-floor" />
        </>
      )}
    </div>
  );
}

export default function Storefront({
  products,
  categories: storeCategories,
  settings,
  featuredReviews = [],
}: {
  products: Product[];
  categories: string[];
  settings: StorefrontSettings;
  featuredReviews?: FeaturedStoreReview[];
}) {
  const categories = ["All scents", ...storeCategories];
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState<(typeof categories)[number]>("All scents");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [cartLoaded, setCartLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const filteredProducts = useMemo(() => {
    const list = products.filter((product) => {
      const matchesCategory = category === "All scents" || product.category === category;
      const words = `${product.name} ${product.category} ${product.notes.join(" ")}`.toLowerCase();
      return matchesCategory && words.includes(query.trim().toLowerCase());
    });

    return [...list].sort((a, b) => {
      if (sortBy === "price-asc") return a.pricePaise - b.pricePaise;
      if (sortBy === "price-desc") return b.pricePaise - a.pricePaise;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [products, category, query, sortBy]);
  const cartLines = useMemo(() => cart.map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) })).filter((line): line is CartItem & { product: Product } => Boolean(line.product)), [cart, products]);
  const cartQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.product.pricePaise * line.quantity, 0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setCart(JSON.parse(localStorage.getItem("flovexa-cart") ?? "[]")); } catch { setCart([]); }
      setCartLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    let active = true;
    try {
      const stored = localStorage.getItem("flovexa-wishlist");
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) setSavedProductIds(list);
      }
    } catch {}

    fetch("/api/account/wishlist", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      if (active && Array.isArray(result.productIds)) {
        setSavedProductIds((current) => Array.from(new Set([...current, ...result.productIds])));
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => { if (cartLoaded) localStorage.setItem("flovexa-cart", JSON.stringify(cart)); }, [cart, cartLoaded]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2300);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function updateQuantity(productId: string, amount: number) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) return amount > 0 ? [...current, { productId, quantity: amount }] : current;
      return current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0);
    });
  }
  function addProduct(product: Product) {
    updateQuantity(product.id, 1);
    setNotice(`${product.name} added to your bag`);
  }

  const curatedFallbackReviews: FeaturedStoreReview[] = [
    {
      author: "Ananya Deshmukh",
      city: "Pune",
      product: "Rose Royale",
      productSlug: "rose-royale",
      quote: "Smells like walking through a private palace garden at dawn. The pink pepper and cashmere drydown lasts easily 12 hours on my scarf. Absolute masterpiece.",
      rating: 5,
    },
    {
      author: "Aarav Mehta",
      city: "Mumbai",
      product: "Chocolate Desire",
      productSlug: "chocolate-desire",
      quote: "Pure edible luxury. The roasted cocoa and cinnamon opening is intoxicating, and the drydown is rich bourbon vanilla. Lasted a solid 13 hours on my jacket.",
      rating: 5,
    },
    {
      author: "Vikramaditya Rao",
      city: "Jaipur",
      product: "Imperial Santal",
      productSlug: "imperial-santal",
      quote: "Captures the true essence of vintage Mysore sandalwood without smelling medicinal. Creamy cedarwood and amber drydown is pure old-money luxury.",
      rating: 5,
    },
    {
      author: "Meera Nair",
      city: "Bengaluru",
      product: "Amber Alchemy",
      productSlug: "amber-alchemy",
      quote: "Just 2 drops of this concentrated oil on my wrist lasted through an entire 14-hour workday. The sillage is warm, intimate, and feels like second skin.",
      rating: 5,
    },
  ];

  const displayedReviews = useMemo(() => {
    if (featuredReviews && featuredReviews.length > 0) {
      return [...featuredReviews, ...curatedFallbackReviews].slice(0, 6);
    }
    return curatedFallbackReviews;
  }, [featuredReviews]);

  const heroProduct = products.find((product) => product.featured) ?? products[0];
  return (
    <main>
      <div className="announcement"><Sparkles size={13} strokeWidth={1.5} /><span>{settings.announcement}</span><ArrowRight size={13} strokeWidth={1.5} /></div>
      <header className="site-header">
        <button className="mobile-menu icon-button" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        <div className="wordmark-wrap">
          <a href="#top" className="wordmark" aria-label="Flovexa Perfumes home">FLOVEXA<span>PERFUMES</span></a>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#collection">The Collection</a>
          <a href="#ritual">The Ritual</a>
          <a href="#reviews">Reviews</a>
          <Link href="/about">Our Story</Link>
          <Link href="/orders">Track Order</Link>
        </nav>
        <div className="header-actions">
          <label className="header-search"><Search size={17} strokeWidth={1.6} /><input aria-label="Search fragrances" placeholder="Search scents" value={query} onChange={(event) => { setQuery(event.target.value); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }} /></label>
          <Link className="icon-button account-link" href="/account" aria-label="Open your account"><span>My account</span></Link>
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartQuantity} items`}><ShoppingBag size={19} strokeWidth={1.6} /><span>Bag</span><b>{cartQuantity}</b></button>
        </div>
      </header>
      {mobileMenuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <a href="#collection" onClick={() => setMobileMenuOpen(false)}>The Collection</a>
          <a href="#ritual" onClick={() => setMobileMenuOpen(false)}>The Ritual</a>
          <a href="#reviews" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)}>Our Story</Link>
          <Link href="/orders" onClick={() => setMobileMenuOpen(false)}>Track Order</Link>
          <Link href="/account" onClick={() => setMobileMenuOpen(false)}>My Account</Link>
        </nav>
      )}

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> {settings.eyebrow}</div>
          <h1>{settings.title}<br /><em>{settings.title_emphasis}</em></h1>
          <p>{settings.description}</p>
          <a className="primary-button" href="#collection">{settings.cta_label} <ArrowRight size={17} /></a>
          <div className="hero-caption"><span>{settings.caption_one}</span><span>{settings.caption_two}</span></div>
        </div>
        <div className={`hero-visual${heroProduct?.imageUrl ? " hero-visual--has-image" : ""}`} style={settings.hero_image_url ? { backgroundImage: `linear-gradient(125deg,rgba(71,50,31,.22),rgba(20,15,10,.12)),url("${settings.hero_image_url}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          {heroProduct && <BottleArt product={heroProduct} hero />}
          {!heroProduct?.imageUrl && <div className="hero-visual-note"><span>EAU DE PARFUM</span><i>Notes that stay with you.</i></div>}
          {!heroProduct?.imageUrl && <span className="hero-roman">01</span>}
        </div>
        <a href="#collection" className="scroll-cue"><span>SCROLL TO EXPLORE</span><ArrowDownRight size={17} /></a>
      </section>

      <section className="value-strip" aria-label="Shopping highlights">
        <div><span>01</span><p><b>Find your notes</b><small>Explore fragrance families</small></p></div>
        <div><span>02</span><p><b>Choose your ritual</b><small>Luxury Perfumes & Fragrance Oils</small></p></div>
        <div><span>03</span><p><b>Make it yours</b><small>A scent for every occasion</small></p></div>
      </section>

      <section className="collection-section" id="collection">
        <div className="section-heading"><div><span className="eyebrow">THE FLOVEXA COLLECTION</span><h2>Find your <em>perfume & fragrance.</em></h2></div><p>Thoughtfully composed Eau de Parfums and pure concentrated oils, crafted to linger in every memory.</p></div>
        <div className="collection-tools">
          <div className="category-tabs" role="tablist" aria-label="Filter fragrances">
            {categories.map((item) => (
              <button
                key={item}
                role="tab"
                aria-selected={category === item}
                className={category === item ? "selected" : ""}
                onClick={() => setCategory(item)}
              >
                {item === "Perfume" ? "Perfumes" : item === "Fragrance" ? "Fragrance Oils" : item}
              </button>
            ))}
          </div>
          <div className="sort-dropdown-wrap">
            <button
              className={`sort-button${sortOpen ? " is-active" : ""}`}
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              type="button"
            >
              <span>
                {sortBy === "featured" && "Curated edit"}
                {sortBy === "price-asc" && "Price: Low to High"}
                {sortBy === "price-desc" && "Price: High to Low"}
                {sortBy === "name" && "Alphabetical: A - Z"}
              </span>
              <ChevronDown size={14} className={`sort-chevron${sortOpen ? " is-rotated" : ""}`} />
            </button>

            {sortOpen && (
              <>
                <div className="sort-backdrop" onClick={() => setSortOpen(false)} />
                <div className="sort-menu" role="listbox">
                  <button
                    type="button"
                    className={`sort-option${sortBy === "featured" ? " is-selected" : ""}`}
                    onClick={() => { setSortBy("featured"); setSortOpen(false); }}
                  >
                    <span>Curated edit (Featured)</span>
                    {sortBy === "featured" && <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    className={`sort-option${sortBy === "price-asc" ? " is-selected" : ""}`}
                    onClick={() => { setSortBy("price-asc"); setSortOpen(false); }}
                  >
                    <span>Price: Low to High</span>
                    {sortBy === "price-asc" && <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    className={`sort-option${sortBy === "price-desc" ? " is-selected" : ""}`}
                    onClick={() => { setSortBy("price-desc"); setSortOpen(false); }}
                  >
                    <span>Price: High to Low</span>
                    {sortBy === "price-desc" && <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    className={`sort-option${sortBy === "name" ? " is-selected" : ""}`}
                    onClick={() => { setSortBy("name"); setSortOpen(false); }}
                  >
                    <span>Alphabetical: A - Z</span>
                    {sortBy === "name" && <Check size={13} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="product-grid">
          {filteredProducts.map((product, index) => <article className="product-card" key={product.id}>
            <a href={`/products/${product.slug}`} className="product-art-link" aria-label={`View ${product.name}`}><BottleArt product={product} /><span className="product-number">0{index + 1}</span><span className="quick-view">DISCOVER THIS SCENT <ArrowRight size={14} /></span></a>
            {(() => {
              const hasMultiSizes = product.variants && product.variants.length > 1;
              const minPrice = hasMultiSizes ? Math.min(...product.variants!.map((v) => v.pricePaise)) : product.pricePaise;
              return (
                <div className="product-info">
                  <div className="product-overline">
                    <span>{product.category}</span>
                    <span>{hasMultiSizes ? `${product.variants!.length} Sizes (${product.variants!.map((v) => v.size).join(", ")})` : product.size}</span>
                  </div>
                  <a href={`/products/${product.slug}`} className="product-name">{product.name.replace(/(?:[\s–—\-|,-]+)?\s*\d+\s*(?:ml|g|oz)\b/gi, "").trim() || product.name}</a>
                  <p className="product-notes">{product.notes.join(" · ")}</p>
                  <div className="product-buy">
                    <div className="product-prices">
                      {hasMultiSizes ? (
                        <>
                          <span style={{ fontSize: "0.72rem", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>From</span>
                          <strong>{money(minPrice)}</strong>
                        </>
                      ) : (
                        <>
                          {product.compareAtPaise && <del>{money(product.compareAtPaise)}</del>}
                          <strong>{money(product.pricePaise)}</strong>
                        </>
                      )}
                    </div>
                    <div className="product-buy-actions">
                      <WishlistButton
                        key={`${product.id}-${savedProductIds.includes(product.id)}`}
                        productId={product.id}
                        initialSaved={savedProductIds.includes(product.id)}
                        onSavedChange={(saved) => setSavedProductIds((current) => saved ? [...new Set([...current, product.id])] : current.filter((id) => id !== product.id))}
                      />
                      {product.stock === 0 ? (
                        <span className="storefront-soldout-pill">Sold out</span>
                      ) : (
                        <button onClick={() => addProduct(product)} aria-label={`Add ${product.name} to bag`}>
                          <Plus size={17} />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </article>)}
          {filteredProducts.length === 0 && <div className="no-results"><h3>{products.length ? "No fragrances found" : "Our first collection is being prepared."}</h3><p>{products.length ? "Try a different note or browse the full collection." : "The Flovexa storefront is ready. Our products will appear here once the catalogue is connected."}</p>{products.length > 0 && <button onClick={() => { setQuery(""); setCategory("All scents"); }}>Clear filters</button>}</div>}
        </div>
        <div className="collection-bottom"><span>{filteredProducts.length} FRAGRANCES TO EXPLORE</span><a href="#top">BACK TO TOP <ArrowRight size={14} /></a></div>
      </section>

      <section className="story-section" id="ritual"><div className="story-mark">F.</div><div className="story-copy"><span className="eyebrow">A SCENT IS NEVER JUST A SCENT</span><h2>Made to be <em>remembered.</em></h2><p>Some things say everything without saying a word. Discover the notes, moods and small rituals that make a fragrance your own.</p></div><StoryExperienceCard products={products} /></section>

      <section className="home-reviews-section" id="reviews">
        <div className="home-reviews-header">
          <div className="home-reviews-title-box">
            <span className="eyebrow">VOICES OF CONNOISSEURS</span>
            <h2>Loved by over <em>10,000+ fragrance lovers.</em></h2>
            <p>Real experiences from patrons who wear Flovexa every day—from morning boardrooms to midnight soirees.</p>
          </div>
          <div className="home-rating-trust-box">
            <div className="home-rating-number">
              <strong>4.9</strong>
              <div className="home-stars-row">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="#e5b23d" color="#e5b23d" />
                ))}
              </div>
            </div>
            <div className="home-trust-text">
              <span>98% Recommendation Rate</span>
              <small>Over 2,800+ Verified 5-Star Reviews</small>
            </div>
          </div>
        </div>

        <div className="home-reviews-grid">
          {displayedReviews.map((item, idx) => (
            <div key={item.id ?? idx} className="home-review-card">
              <div className="home-review-card-top">
                <div className="home-card-stars">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="#e5b23d" color="#e5b23d" />
                  ))}
                </div>
                {item.productSlug ? (
                  <Link href={`/products/${item.productSlug}`} className="home-review-product-pill" title={`View ${item.product}`}>
                    {item.product}
                  </Link>
                ) : (
                  <span className="home-review-product-pill">{item.product}</span>
                )}
              </div>
              <p className="home-review-quote">“{item.quote}”</p>
              <div className="home-review-footer">
                <div className="home-author-avatar">{item.author.charAt(0).toUpperCase()}</div>
                <div className="home-author-info">
                  <strong>{item.author}</strong>
                  <span><Check size={11} className="home-check-icon" /> Verified Buyer · {item.city}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-top">
          {/* 1. Official Brand & Atelier Identity */}
          <div className="footer-brand-block">
            <div className="footer-brand-title">
              <a href="#top" className="wordmark">FLOVEXA<span>PARFUM</span></a>
              <span className="reg-badge">®</span>
            </div>
            <div className="footer-tagline">SCENTS THAT STAY</div>

            <div className="footer-contact-list">
              <div className="footer-contact-item f-addr-item">
                <MapPin size={13} className="f-icon-svg" />
                <span className="f-addr-text">
                  21, Ramdev Row-House Shopping, Opp. Shivdhara Society,<br className="f-addr-br" />
                  Rajmandir Rd, <span className="no-orphan">Surat – 395011</span>
                </span>
              </div>
              <div className="footer-contact-item">
                <Phone size={13} className="f-icon-svg" />
                <span>
                  <a href="tel:+919662765757">+91 96627 65757</a>
                  <span className="f-sep">·</span>
                  <a href="https://wa.me/919662765757" target="_blank" rel="noreferrer" className="f-wa-link">WhatsApp</a>
                </span>
              </div>
              <div className="footer-contact-item">
                <Mail size={13} className="f-icon-svg" />
                <a href="mailto:flovexaenterprises@gmail.com">flovexaenterprises@gmail.com</a>
              </div>
              <div className="footer-contact-item">
                <Package size={13} className="f-icon-svg" />
                <span>Packed &amp; Marketed by: <strong>FLOVEXA</strong></span>
              </div>
            </div>
          </div>

          {/* 2. Collection & Navigation */}
          <div className="footer-column">
            <span>COLLECTION</span>
            <a href="#collection" onClick={() => setCategory("All scents")}>Shop all</a>
            <a href="#collection" onClick={() => setCategory("Perfume")}>Artisanal Perfumes</a>
            <a href="#collection" onClick={() => setCategory("Fragrance")}>Fragrance Oils &amp; Attars</a>
            <Link href="/orders">Track your order</Link>
            <Link href="/account">Customer account</Link>
          </div>

          {/* 3. Care & Policies */}
          <div className="footer-column">
            <span>HELP &amp; POLICIES</span>
            <Link href="/shipping">Shipping &amp; delivery</Link>
            <Link href="/returns">Returns &amp; refunds (24h)</Link>
            <Link href="/contact">Contact concierge</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of service</Link>
          </div>

          {/* 4. Instagram Column */}
          <div className="footer-column footer-insta-column">
            <span>FOLLOW ON INSTAGRAM</span>
            <a
              href="https://www.instagram.com/flovexa_perfume"
              target="_blank"
              rel="noreferrer"
              className="footer-qr-card-wrap"
              title="Scan QR or click to open @flovexa_perfume on Instagram"
            >
              <Image
                src="/flovexa-instagram-qr.png"
                alt="Instagram QR Code - @flovexa_perfume"
                width={80}
                height={80}
                className="footer-qr-img"
              />
              <div className="footer-insta-btn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>@flovexa_perfume ↗</span>
              </div>
            </a>
          </div>
        </div>

        {/* Footer Bottom Bar with Centered THANK YOU */}
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} FLOVEXA® PARFUM</span>
          <span className="footer-thankyou">T H A N K &nbsp; Y O U</span>
          <span>SURAT, GUJARAT · 395011 · INDIA</span>
        </div>
      </footer>

      <div className={`drawer-scrim${cartOpen ? " is-visible" : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer${cartOpen ? " is-open" : ""}`} aria-label="Shopping bag" aria-hidden={!cartOpen}>
        <div className="drawer-heading"><div><span className="eyebrow">YOUR SELECTION</span><h2>Your bag <small>({cartQuantity})</small></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close bag"><X size={21} /></button></div>
        {cartLines.length ? <><div className="drawer-items">{cartLines.map(({ product, quantity }) => <div className="drawer-item" key={product.id}><div className="drawer-thumb"><BottleArt product={product} /></div><div className="drawer-item-copy"><span>{product.category}</span><h3>{product.name}</h3><small>{product.size} · {product.concentration}</small><div className="quantity-control"><button onClick={() => updateQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`}><Minus size={13} /></button><span>{quantity}</span><button onClick={() => updateQuantity(product.id, 1)} aria-label={`Add one ${product.name}`}><Plus size={13} /></button></div></div><strong>{money(product.pricePaise * quantity)}</strong></div>)}</div><div className="drawer-summary"><div><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><small>Shipping and taxes are calculated at checkout.</small><a className="primary-button checkout-link" href={`/checkout?items=${encodeURIComponent(JSON.stringify(cart))}`}>Continue to checkout <ArrowRight size={16} /></a><button className="continue-shopping" onClick={() => setCartOpen(false)}>Continue exploring</button></div></> : <div className="empty-bag"><span className="empty-bag-icon"><ShoppingBag size={24} /></span><h3>Your bag is waiting</h3><p>Find a fragrance that feels like you.</p><button className="primary-button" onClick={() => setCartOpen(false)}>Explore the collection <ArrowRight size={16} /></button></div>}
      </aside>
      {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
    </main>
  );
}
