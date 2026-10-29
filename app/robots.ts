import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/google-verify", "/google*.html"],
        disallow: ["/api/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/api/google-verify", "/google*.html"],
        disallow: ["/api/"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/", "/favicon.ico", "/favicon-48x48.png", "/icon.png", "/icon.svg", "/apple-touch-icon.png"],
      },
    ],
    sitemap: canonicalUrl("/sitemap.xml"),
  };
}
