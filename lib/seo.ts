import type { Metadata } from "next";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

export const siteUrl =
  configuredSiteUrl && URL.canParse(configuredSiteUrl)
    ? new URL(configuredSiteUrl).origin
    : process.env.NODE_ENV === "production"
    ? "https://flovexa.in"
    : "http://localhost:3000";

export function canonicalUrl(path = "/") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(cleanPath, `${siteUrl}/`).toString();
}

export function metaDescription(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function noIndexMetadata(title: string, follow = false): Metadata {
  return { title, robots: { index: false, follow } };
}
