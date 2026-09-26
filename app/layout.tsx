import type { Metadata } from "next";
import "./globals.css";
import "./checkout.css";
import "./product-detail.css";
import "./operations.css";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const metadataBase = configuredSiteUrl && URL.canParse(configuredSiteUrl)
  ? new URL(configuredSiteUrl)
  : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: { default: "Flovexa Parfums — Find your signature scent", template: "%s | Flovexa Parfums" },
  description: "Discover thoughtful fragrances, modern attars and scent discovery sets from Flovexa Parfums.",
  applicationName: "Flovexa Parfums",
  openGraph: {
    title: "Flovexa Parfums — Find your signature scent",
    description: "A considered collection of fragrances for every mood and moment.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
