"use client";

import Link from "next/link";
import { Store, ShieldCheck, Package, TrendingUp, Truck } from "lucide-react";
import SellerAuthForm from "@/components/seller-auth-form";

export default function SellerPortalLanding({ userEmail, isCustomer }: { userEmail?: string; isCustomer?: boolean }) {
  return (
    <main className="seller-landing-page">
      {/* Top Navigation */}
      <header className="seller-landing-header">
        <div className="seller-landing-header-left">
          <Link href="/store" className="wordmark">
            FLOVEXA<span>PERFUMES</span>
          </Link>
          <span className="portal-badge portal-badge-seller">
            <Store size={12} /> SELLER CENTRAL · MERCHANT HUB
          </span>
        </div>
        <div className="seller-landing-header-right">
          <Link href="/store" className="customer-store-btn">
            ← Visit Customer Store (Buy Scents)
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="seller-landing-hero">
        <div className="seller-landing-hero-content">
          <span className="seller-hero-pill">
            <Store size={13} /> OFFICIAL MERCHANT PORTAL
          </span>
          <h1>
            Partner with Flovexa.<br />
            <em>Sell Luxury Fragrances Across India.</em>
          </h1>
          <p>
            Welcome to Flovexa Seller Central. Showcase your artisanal Eau de Parfums and concentrated fragrance oils to thousands of verified perfume connoisseurs nationwide.
          </p>

          <div className="seller-landing-features">
            <div className="seller-feat-card">
              <Package size={22} className="seller-feat-icon" />
              <div>
                <h4>Direct Catalog Control</h4>
                <p>Add new scents, update batch stocks, and adjust pricing instantly.</p>
              </div>
            </div>
            <div className="seller-feat-card">
              <TrendingUp size={22} className="seller-feat-icon" />
              <div>
                <h4>High-Intent Fragrance Buyers</h4>
                <p>Reach buyers actively looking for authentic Indian & European luxury blends.</p>
              </div>
            </div>
            <div className="seller-feat-card">
              <Truck size={22} className="seller-feat-icon" />
              <div>
                <h4>Fulfillment & Courier Tracking</h4>
                <p>Integrated order dispatch with custom tracking links and customer updates.</p>
              </div>
            </div>
            <div className="seller-feat-card">
              <ShieldCheck size={22} className="seller-feat-icon" />
              <div>
                <h4>Verified Merchant Settlements</h4>
                <p>Transparent weekly sales reporting and direct merchant bank transfers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login & Registration Box */}
        <div className="seller-landing-auth-box">
          <div className="seller-auth-card">
            <SellerAuthForm userEmail={userEmail} isCustomer={isCustomer} />

            <div className="seller-auth-footer">
              <div className="seller-auth-divider">
                <span>OR</span>
              </div>
              <Link href="/store" className="seller-auth-return">
                Looking to purchase perfumes? Go to Customer Storefront
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Metrics Bar */}
      <section className="seller-landing-metrics">
        <div>
          <strong>10,000+</strong>
          <span>Monthly Fragrance Buyers</span>
        </div>
        <div>
          <strong>0%</strong>
          <span>Upfront Listing Fee</span>
        </div>
        <div>
          <strong>24 Hours</strong>
          <span>Merchant Support Turnaround</span>
        </div>
        <div>
          <strong>100%</strong>
          <span>Verified Online Payments (UPI, Cards)</span>
        </div>
      </section>
    </main>
  );
}
