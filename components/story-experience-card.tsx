"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Droplets, Layers, Sparkles } from "lucide-react";
import type { Product } from "@/lib/products";

type ExperienceTab = "layering" | "discovery" | "matcher";

interface StoryExperienceCardProps {
  products: Product[];
}

export default function StoryExperienceCard({ products }: StoryExperienceCardProps) {
  const [activeTab, setActiveTab] = useState<ExperienceTab>("layering");
  const [selectedMood, setSelectedMood] = useState<"warm" | "fresh" | "royal">("warm");

  const oilProduct = products.find((p) => p.category === "Fragrance" || p.concentration.toLowerCase().includes("oil")) ?? products[0];
  const edpProduct = products.find((p) => p.category === "Perfume" || p.concentration.toLowerCase().includes("parfum")) ?? products[0];

  const moodProductMap = {
    warm: products[0],
    fresh: products[1] ?? products[0],
    royal: products[2] ?? products[0],
  };

  const matchedProduct = moodProductMap[selectedMood] ?? products[0];

  return (
    <div className="story-experience-card" aria-label="Flovexa Fragrance Experience">
      {/* Top Experience Navigation Tabs */}
      <div className="experience-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "layering"}
          className={`experience-tab-btn ${activeTab === "layering" ? "is-active" : ""}`}
          onClick={() => setActiveTab("layering")}
        >
          <Layers size={13} strokeWidth={1.8} />
          <span>Layering Secret</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "discovery"}
          className={`experience-tab-btn ${activeTab === "discovery" ? "is-active" : ""}`}
          onClick={() => setActiveTab("discovery")}
        >
          <Sparkles size={13} strokeWidth={1.8} />
          <span>Discovery Box</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "matcher"}
          className={`experience-tab-btn ${activeTab === "matcher" ? "is-active" : ""}`}
          onClick={() => setActiveTab("matcher")}
        >
          <Droplets size={13} strokeWidth={1.8} />
          <span>Scent Matcher</span>
        </button>
      </div>

      {/* Tab 1: The Layering Ritual (Oil + Spray) */}
      {activeTab === "layering" && (
        <div className="experience-pane" key="layering">
          <div className="pane-header">
            <span className="pane-tagline">✦ THE 16-HOUR EXTENDED SILLAGE RITUAL</span>
            <h3>How to combine <em>Oil & Perfume</em></h3>
            <p>Layering creates depth that a single spray cannot achieve alone.</p>
          </div>

          <div className="ritual-duo-grid">
            {/* Step 1: Oil */}
            <div className="ritual-step-card">
              <div className="ritual-step-number">STEP 01</div>
              <div className="ritual-step-visual">
                {oilProduct?.imageUrl ? (
                  <Image
                    src={oilProduct.imageUrl}
                    alt={oilProduct.name}
                    width={180}
                    height={180}
                    className="ritual-bottle-img"
                    unoptimized
                  />
                ) : (
                  <div className="ritual-img-fallback">Oil</div>
                )}
                <span className="ritual-pill">Base Layer</span>
              </div>
              <div className="ritual-step-body">
                <h4>Pure Fragrance Oil</h4>
                <p>Apply 2 drops on pulse points. Warm skin locks concentrated botanical oil for 12+ hours.</p>
                <div className="ritual-feature">
                  <Check size={12} strokeWidth={2.2} />
                  <span>0% Alcohol · Deep Skin Bond</span>
                </div>
              </div>
            </div>

            {/* Step 2: Spray */}
            <div className="ritual-step-card">
              <div className="ritual-step-number">STEP 02</div>
              <div className="ritual-step-visual">
                {edpProduct?.imageUrl ? (
                  <Image
                    src={edpProduct.imageUrl}
                    alt={edpProduct.name}
                    width={180}
                    height={180}
                    className="ritual-bottle-img"
                    unoptimized
                  />
                ) : (
                  <div className="ritual-img-fallback">EDP</div>
                )}
                <span className="ritual-pill">Aura Cloud</span>
              </div>
              <div className="ritual-step-body">
                <h4>Eau de Parfum Mist</h4>
                <p>Mist 2-3 clouds over collar & hair. Creates a magnetic 6-foot projection aura in the air.</p>
                <div className="ritual-feature">
                  <Check size={12} strokeWidth={2.2} />
                  <span>20% Extrait · Magnetic Trail</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pane-footer-bar">
            <span><b>The Result:</b> An irresistible trail that stays from morning till midnight.</span>
            <a href="#collection" className="pane-action-link">
              Shop Both Scents <ArrowRight size={13} />
            </a>
          </div>
        </div>
      )}

      {/* Tab 2: The Discovery Set */}
      {activeTab === "discovery" && (
        <div className="experience-pane" key="discovery">
          <div className="pane-header">
            <span className="pane-tagline">✦ TRY BEFORE COMMITTING TO A FULL BOTTLE</span>
            <h3>The Flovexa <em>Discovery Set</em></h3>
            <p>5 Deluxe miniature sample vials (5ml each). Find your signature scent from home.</p>
          </div>

          <div className="discovery-vials-strip">
            {products.slice(0, 5).map((p, idx) => (
              <div key={p.id} className="discovery-vial-item">
                <div className="vial-thumb">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt={p.name} width={70} height={70} className="vial-img" unoptimized />
                  ) : null}
                  <span className="vial-index">0{idx + 1}</span>
                </div>
                <span className="vial-title">{p.name.split(" ")[0]}</span>
                <small className="vial-cat">{p.category === "Fragrance" ? "Oil" : "EDP"}</small>
              </div>
            ))}
          </div>

          <div className="discovery-perk-box">
            <div className="discovery-pricing">
              <span className="discovery-price-tag">₹499</span>
              <span className="discovery-price-caption">Includes 5 x 5ml Deluxe Vials + Velvet Pouch</span>
            </div>
            <div className="discovery-cashback-badge">
              <strong>100% REDEEMABLE VOUCHER</strong>
              <small>Get a flat ₹499 coupon inside your box for your first full bottle purchase.</small>
            </div>
          </div>

          <div className="pane-footer-bar">
            <span>Free Express Delivery across India.</span>
            <a href="#collection" className="pane-action-link pane-action-primary">
              Order Discovery Box (₹499) <ArrowRight size={13} />
            </a>
          </div>
        </div>
      )}

      {/* Tab 3: Scent Matcher */}
      {activeTab === "matcher" && (
        <div className="experience-pane" key="matcher">
          <div className="pane-header">
            <span className="pane-tagline">✦ 1-TAP SCENT RECOMMENDATION</span>
            <h3>What is your <em>mood today?</em></h3>
            <p>Select your occasion and discover your bespoke Flovexa fragrance.</p>
          </div>

          <div className="matcher-chip-group">
            <button
              type="button"
              className={`matcher-chip ${selectedMood === "warm" ? "is-selected" : ""}`}
              onClick={() => setSelectedMood("warm")}
            >
              🍫 <span>Date Night & Warm</span>
            </button>
            <button
              type="button"
              className={`matcher-chip ${selectedMood === "fresh" ? "is-selected" : ""}`}
              onClick={() => setSelectedMood("fresh")}
            >
              🌊 <span>Office & Oceanic</span>
            </button>
            <button
              type="button"
              className={`matcher-chip ${selectedMood === "royal" ? "is-selected" : ""}`}
              onClick={() => setSelectedMood("royal")}
            >
              👑 <span>Royal & Evening Oud</span>
            </button>
          </div>

          {matchedProduct && (
            <div className="matcher-recommendation-card">
              <div className="matcher-rec-visual">
                {matchedProduct.imageUrl ? (
                  <Image
                    src={matchedProduct.imageUrl}
                    alt={matchedProduct.name}
                    width={140}
                    height={140}
                    className="matcher-rec-img"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="matcher-rec-details">
                <span className="matcher-rec-cat">{matchedProduct.category} · {matchedProduct.size}</span>
                <h4>{matchedProduct.name}</h4>
                <p className="matcher-rec-notes">
                  <b>Notes:</b> {matchedProduct.notes.slice(0, 3).join(" · ")}
                </p>
                <div className="matcher-rec-meta">
                  <span className="matcher-rec-price">
                    ₹{(matchedProduct.pricePaise / 100).toLocaleString("en-IN")}
                  </span>
                  <Link href={`/products/${matchedProduct.slug}`} className="matcher-rec-btn">
                    View Scent <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

