"use client";

import Link from "next/link";
import { Clock, ShieldAlert, Store, MessageCircle, ArrowLeft, LogOut } from "lucide-react";

export default function SellerApplicationPending({
  email,
  storeName,
  appliedDate,
  isSuspended,
}: {
  email: string;
  storeName: string;
  appliedDate?: string;
  isSuspended?: boolean;
}) {
  const formattedDate = appliedDate
    ? new Date(appliedDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="seller-landing-page">
      <header className="seller-landing-header">
        <div className="seller-landing-header-left">
          <Link href="/store" className="wordmark">
            FLOVEXA<span>PERFUMES</span>
          </Link>
          <span className="portal-badge portal-badge-seller">
            <Store size={12} /> SELLER CENTRAL · ONBOARDING
          </span>
        </div>
        <div className="seller-landing-header-right">
          <Link href="/store" className="customer-store-btn">
            ← Return to Storefront
          </Link>
        </div>
      </header>

      <section className="seller-pending-section">
        <div className="seller-pending-card">
          <div className="pending-icon-ring">
            {isSuspended ? <ShieldAlert size={38} /> : <Clock size={38} />}
          </div>

          <span className="pending-badge-pill">
            {isSuspended ? "ACCOUNT ACCESS PAUSED" : "⏳ AWAITING OWNER APPROVAL"}
          </span>

          <h2>
            {isSuspended
              ? "Seller Access Suspended"
              : "Seller Application Under Review"}
          </h2>

          <p className="pending-description">
            {isSuspended
              ? `Access to your seller store "${storeName}" has been temporarily paused by the Flovexa Store Owner.`
              : `Your seller application for "${storeName}" has been received. In Flovexa, all merchant accounts require direct permission and verification from the Store Owner (flovexaenterprises@gmail.com) before seller access is granted.`}
          </p>

          <div className="pending-details-box">
            <div className="pending-detail-row">
              <span>Merchant Store:</span>
              <strong>{storeName}</strong>
            </div>
            <div className="pending-detail-row">
              <span>Account Email:</span>
              <strong>{email}</strong>
            </div>
            {formattedDate && (
              <div className="pending-detail-row">
                <span>Application Date:</span>
                <strong>{formattedDate}</strong>
              </div>
            )}
            <div className="pending-detail-row">
              <span>Current Status:</span>
              <strong className={isSuspended ? "status-danger" : "status-warning"}>
                {isSuspended ? "Suspended by Owner" : "Pending Owner Permission"}
              </strong>
            </div>
          </div>

          <div className="pending-notice-banner">
            <p>
              🔒 <strong>Strict Owner Permission Policy:</strong> Nobody can create products or access Seller Central without explicit approval from the primary store owner. If you have already spoken with the owner, please check back once they approve your account from the Admin panel.
            </p>
          </div>

          <div className="pending-actions-row">
            <a
              href="https://wa.me/919662765757?text=Hello%20Flovexa%20Owner,%20I%20have%20submitted%20a%20seller%20application%20for%20my%20store%20and%20would%20like%20to%20request%20approval."
              target="_blank"
              rel="noreferrer"
              className="pending-btn-whatsapp"
            >
              <MessageCircle size={16} /> Contact Store Owner on WhatsApp
            </a>

            <Link href="/store" className="pending-btn-secondary">
              <ArrowLeft size={15} /> Return to Storefront
            </Link>

            <form action="/auth/signout" method="post" className="pending-signout-form">
              <button type="submit" className="pending-btn-signout">
                <LogOut size={14} /> Sign out
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

