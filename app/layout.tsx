import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteUrl } from "@/lib/seo";
import "./globals.css";
import "./checkout.css";
import "./product-detail.css";
import "./operations.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Flovexa — Luxury Perfumes & Fragrance Oils", template: "%s | Flovexa Perfumes" },
  description: "Discover luxury Eau de Parfums and pure concentrated fragrance oils from Flovexa Perfumes.",
  applicationName: "Flovexa Perfumes",
  openGraph: {
    title: "Flovexa — Luxury Perfumes & Fragrance Oils",
    description: "Discover luxury Eau de Parfums and pure concentrated fragrance oils for every mood and moment.",
    type: "website",
    locale: "en_IN",
    siteName: "Flovexa Perfumes",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flovexa — Luxury Perfumes & Fragrance Oils",
    description: "Discover luxury Eau de Parfums and pure concentrated fragrance oils for every mood and moment.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
