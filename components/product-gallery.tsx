"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [startIndex, setStartIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(
    product.variants?.[0]?.size || product.size || "50 ml"
  );
  const touchStartXRef = useRef<number | null>(null);

  const totalImages = galleryImages.length;
  const maxStartIndex = Math.max(0, totalImages - 3);

  // Keep selected size in sync if product prop updates
  useEffect(() => {
    setSelectedSize(product.variants?.[0]?.size || product.size || "50 ml");
  }, [product.size, product.variants]);

  // Sync activeIndex & selected size with custom events from purchase panel
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ imageUrl?: string }>;
      if (custom.detail?.imageUrl) {
        const found = galleryImages.findIndex((img) => img.url === custom.detail?.imageUrl);
        if (found !== -1) {
          selectImage(found);
        }
      }
    };

    const variantHandler = (e: Event) => {
      const custom = e as CustomEvent<{ size?: string; imageUrl?: string }>;
      if (custom.detail?.size) {
        setSelectedSize(custom.detail.size);
      }
      if (custom.detail?.imageUrl) {
        const found = galleryImages.findIndex((img) => img.url === custom.detail?.imageUrl);
        if (found !== -1) {
          selectImage(found);
        }
      }
    };

    window.addEventListener("flovexa-select-image", handler);
    window.addEventListener("flovexa-select-variant", variantHandler);
    return () => {
      window.removeEventListener("flovexa-select-image", handler);
      window.removeEventListener("flovexa-select-variant", variantHandler);
    };
  }, [galleryImages, startIndex, maxStartIndex]);

  // Select image and auto-shift viewport so active item is visible
  const selectImage = (index: number) => {
    setActiveIndex(index);
    if (totalImages > 3) {
      if (index < startIndex) {
        setStartIndex(index);
      } else if (index > startIndex + 2) {
        setStartIndex(Math.min(maxStartIndex, index - 2));
      }
    }
  };

  // Click Right Icon on thumbnails (Next)
  const handleNext = () => {
    if (totalImages <= 1) return;
    if (totalImages <= 3) {
      setActiveIndex((prev) => (prev + 1) % totalImages);
      return;
    }
    // More than 3 images: shift thumbnail window by 1 to reveal next image
    if (startIndex < maxStartIndex) {
      const nextStart = startIndex + 1;
      setStartIndex(nextStart);
      setActiveIndex(nextStart + 2); // activate newly revealed rightmost image
    } else {
      // Loop back to start
      setStartIndex(0);
      setActiveIndex(0);
    }
  };

  // Click Left Icon on thumbnails (Prev)
  const handlePrev = () => {
    if (totalImages <= 1) return;
    if (totalImages <= 3) {
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalImages - 1));
      return;
    }
    // More than 3 images: shift thumbnail window back by 1 to reveal prev image
    if (startIndex > 0) {
      const prevStart = startIndex - 1;
      setStartIndex(prevStart);
      setActiveIndex(prevStart); // activate newly revealed leftmost image
    } else {
      // Loop to end
      setStartIndex(maxStartIndex);
      setActiveIndex(totalImages - 1);
    }
  };

  // Main bottle image arrows step through images 1-by-1
  const handleStepNext = () => {
    if (totalImages <= 1) return;
    const nextIdx = (activeIndex + 1) % totalImages;
    selectImage(nextIdx);
  };

  const handleStepPrev = () => {
    if (totalImages <= 1) return;
    const prevIdx = (activeIndex - 1 + totalImages) % totalImages;
    selectImage(prevIdx);
  };

  // Mobile Touch Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff < -35) {
      handleNext();
    } else if (diff > 35) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  const activeImage = galleryImages[activeIndex] || galleryImages[0];

  const badgeLabels = galleryImages.map((img, idx) =>
    idx === 0 ? `Signature Bottle · ${selectedSize}` : `Photo View 0${idx + 1}`
  );

  return (
    <div className="product-visual-panel">
      {/* Main Large Image */}
      <div
        className="product-bottle-wrap"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={activeImage.url}
          alt={`${product.name} - ${activeImage.label}`}
          width={1024}
          height={1024}
          className="product-real-image"
          unoptimized
          priority
        />
        <span className="gallery-view-badge">
          {badgeLabels[activeIndex] || activeImage.label}
          {totalImages > 1 && (
            <span className="gallery-counter-pill">
              {activeIndex + 1}/{totalImages}
            </span>
          )}
        </span>

        {/* Floating navigation arrows on large product view */}
        {totalImages > 1 && (
          <>
            <button
              type="button"
              className="main-image-arrow main-image-arrow-prev"
              onClick={handleStepPrev}
              aria-label="Previous view"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              className="main-image-arrow main-image-arrow-next"
              onClick={handleStepNext}
              aria-label="Next view"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      {/* Compact 3-Thumbnail Carousel with Navigation Icons on Both Sides */}
      {totalImages > 1 && (
        <div className="mini-gallery-carousel-wrap">
          {/* Left Navigation Icon */}
          <button
            type="button"
            className="gallery-nav-btn prev"
            onClick={handlePrev}
            aria-label="Previous view"
            title="Previous view"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>

          {/* Viewport showing exactly 3 thumbnail boxes */}
          <div
            className="mini-gallery-viewport"
            role="tablist"
            aria-label="Product image gallery"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="mini-gallery-track"
              style={{
                transform: `translateX(calc(-${startIndex} * (var(--thumb-w, 132px) + var(--thumb-gap, 12px))))`,
              }}
            >
              {galleryImages.map((item, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`mini-card ${isSelected ? "active" : ""}`}
                    onClick={() => selectImage(idx)}
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
          </div>

          {/* Right Navigation Icon */}
          <button
            type="button"
            className="gallery-nav-btn next"
            onClick={handleNext}
            aria-label="Next view"
            title="Next view"
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      )}

      {/* Dots Indicator when there are more than 3 images */}
      {totalImages > 3 && (
        <div className="gallery-dots-indicator" aria-hidden="true">
          {galleryImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`gallery-dot ${activeIndex === idx ? "active" : ""}`}
              onClick={() => selectImage(idx)}
              aria-label={`Go to photo ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
