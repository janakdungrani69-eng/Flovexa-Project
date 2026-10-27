import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteUrl } from "@/lib/seo";
import JsonLd from "@/components/json-ld";
import "./globals.css";
import "./checkout.css";
import "./product-detail.css";
import "./operations.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#14110d",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Flovexa — Luxury Perfumes & Pure Fragrance Oils",
    template: "%s | Flovexa Perfumes",
  },
  description:
    "Official website of Flovexa. Discover luxury artisanal Eau de Parfums and pure concentrated fragrance oils crafted in Surat, India with pure European extracts.",
  applicationName: "Flovexa",
  authors: [{ name: "Flovexa Perfumes", url: siteUrl }],
  creator: "Flovexa Perfumes",
  publisher: "Flovexa Perfumes",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Flovexa — Luxury Perfumes & Pure Fragrance Oils",
    description:
      "Official website of Flovexa. Discover luxury artisanal Eau de Parfums and pure concentrated fragrance oils crafted in India with pure European extracts.",
    type: "website",
    locale: "en_IN",
    siteName: "Flovexa",
    url: "/",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Flovexa Luxury Perfumes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flovexa — Luxury Perfumes & Pure Fragrance Oils",
    description:
      "Discover luxury Eau de Parfums and pure concentrated fragrance oils for every mood and moment from Flovexa.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                name: "Flovexa",
                alternateName: ["Flovexa Perfumes", "Flovexa Official", "Flovexa India", "flovexa.in"],
                url: `${siteUrl}/`,
                inLanguage: "en-IN",
              },
              {
                "@type": "Organization",
                "@id": `${siteUrl}/#organization`,
                name: "Flovexa",
                legalName: "Flovexa Perfumes",
                url: `${siteUrl}/`,
                logo: {
                  "@type": "ImageObject",
                  url: `${siteUrl}/icon.png`,
                  width: 512,
                  height: 512,
                },
                contactPoint: {
                  "@type": "ContactPoint",
                  telephone: "+91-9662765757",
                  contactType: "customer service",
                  areaServed: "IN",
                  availableLanguage: ["en", "hi", "gu"],
                },
                sameAs: ["https://www.instagram.com/flovexa_perfume"],
              },
            ],
          }}
        />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
