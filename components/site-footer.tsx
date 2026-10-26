"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Package, Phone } from "lucide-react";

export default function SiteFooter({
  onSelectCategory,
}: {
  onSelectCategory?: (category: string) => void;
}) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        {/* 1. Official Brand & Atelier Identity */}
        <div className="footer-brand-block">
          <div className="footer-brand-title">
            <Link href="/store" className="wordmark">
              FLOVEXA<span>PARFUM</span>
            </Link>
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
                <a href="https://wa.me/919662765757" target="_blank" rel="noreferrer" className="f-wa-link">
                  WhatsApp
                </a>
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
          <Link
            href="/store#collection"
            onClick={() => onSelectCategory?.("All scents")}
          >
            Shop all
          </Link>
          <Link
            href="/store#collection"
            onClick={() => onSelectCategory?.("Perfume")}
          >
            Artisanal Perfumes
          </Link>
          <Link
            href="/store#collection"
            onClick={() => onSelectCategory?.("Fragrance")}
          >
            Fragrance Oils &amp; Attars
          </Link>
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
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
  );
}

