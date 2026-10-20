"use client";

import Link from "next/link";
import { Store, ShieldCheck, Package, TrendingUp, Truck } from "lucide-react";
import SellerAuthForm from "@/components/seller-auth-form";

export default function SellerPortalLanding() {
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
            <Store size={13} /> AUTHORIZED MERCHANT PORTAL
          </span>
          <h1>
            Flovexa Seller Central.<br />
            <em>Manage Catalog & Orders.</em>
          </h1>
          <p>
            Private merchant console for authorized Flovexa fragrance partners. Manage product listings, update prices, track stock levels, and dispatch orders across India.
          </p>

          <div className="seller-landing-features">
            <div className="seller-feat-card">
              <Package size={22} className="seller-feat-icon" />
              <div>
                <h4>Direct Catalog Control</h4>
                <p>Add new perfumes, upload high-res imagery, and update batch stocks instantly.</p>
              </div>
            </div>
            <div className="seller-feat-card">
              <Truck size={22} className="seller-feat-icon" />
              <div>
                <h4>Fulfillment & Courier Tracking</h4>
                <p>Generate consolidated shipping labels, attach tracking numbers, and fulfill customer orders.</p>
              </div>
            </div>
            <div className="seller-feat-card">
              <TrendingUp size={22} className="seller-feat-icon" />
              <div>
                <h4>Real-Time Order Insights</h4>
                <p>Monitor buyer orders, order quantities, and revenue analytics.</p>
              </div>
            </div>
            <div className="seller-feat-card">
              <ShieldCheck size={22} className="seller-feat-icon" />
              <div>
                <h4>Secure Merchant Hub</h4>
                <p>Private access restricted strictly to verified Flovexa owners and merchants.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Box */}
        <div className="seller-landing-auth-box">
          <div className="seller-auth-card">
            <SellerAuthForm />

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

      {/* Metrics Bar */}
      <section className="seller-landing-metrics">
        <div>
          <strong>100%</strong>
          <span>Direct Merchant Control</span>
        </div>
        <div>
          <strong>Real-Time</strong>
          <span>Inventory Sync</span>
        </div>
        <div>
          <strong>Automated</strong>
          <span>Combo Shipping Labels</span>
        </div>
        <div>
          <strong>Verified</strong>
          <span>PAN-India Order Fulfillment</span>
        </div>
      </section>
    </main>
  );
}
