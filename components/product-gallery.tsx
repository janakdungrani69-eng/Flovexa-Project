"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Product } from "@/lib/products";

interface GalleryImage {
  url: string;
  label: string;
}

interface ProductGalleryProps {
  product: Product;
}

export default function ProductGallery({ product }: ProductGalleryProps) {
  const userImages =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
      ? [product.imageUrl]
      : [];

  const galleryImages: GalleryImage[] =
    userImages.length > 0
      ? userImages.map((url, idx) => ({
          url,
          label: idx === 0 ? "Signature Bottle" : `View 0${idx + 1}`,
        }))
      : [
          {
            url: "/products/flovexa-luxury-box.jpg",
            label: "Signature Packaging",
          },
        ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ imageUrl?: string }>;
      if (custom.detail?.imageUrl) {
        const found = galleryImages.findIndex((img) => img.url === custom.detail?.imageUrl);
        if (found !== -1) setActiveIndex(found);
      }
    };
    window.addEventListener("flovexa-select-image", handler);
    return () => window.removeEventListener("flovexa-select-image", handler);
  }, [galleryImages]);
  const activeImage = galleryImages[activeIndex] || galleryImages[0];

  const badgeLabels = galleryImages.map((img, idx) =>
    idx === 0 ? `Signature Bottle · ${product.size}` : `Photo View 0${idx + 1}`
  );

  return (
    <div className="product-visual-panel">
      {/* Main Large Image */}
      <div className="product-bottle-wrap">
        <Image
          src={activeImage.url}
          alt={`${product.name} - ${activeImage.label}`}
          width={1024}
          height={1024}
          className="product-real-image"
          unoptimized
          priority
        />
        <span className="gallery-view-badge">{badgeLabels[activeIndex] || activeImage.label}</span>
      </div>

      {/* Different images thumbnail bar below main image */}
      {galleryImages.length > 1 && (
        <div className="mini-gallery" role="tablist" aria-label="Product image gallery">
          {galleryImages.map((item, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`mini-card ${isSelected ? "active" : ""}`}
                onClick={() => setActiveIndex(idx)}
              >
                <div className="mini-thumb-wrap">
                  <Image
                    src={item.url}
                    alt={`${product.name} ${item.label}`}
                    width={240}
                    height={240}
                    className="mini-thumb-img"
                    unoptimized
                  />
                </div>
                <span className="mini-thumb-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
