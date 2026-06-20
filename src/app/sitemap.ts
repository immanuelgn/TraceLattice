import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://tracelattice.vercel.app";
  return ["", "/deep-scan", "/compare", "/recent", "/methodology", "/ethics", "/about"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: path ? 0.7 : 1 }));
}
