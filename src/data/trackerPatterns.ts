import type { TrackerCategory } from "@/lib/scan/types";

export interface TrackerPattern {
  pattern: string;
  category: TrackerCategory;
}

// This small, local list is intentionally transparent and non-exhaustive.
// It identifies common providers without making a compliance determination.
export const trackerPatterns: TrackerPattern[] = [
  ...["google-analytics.com", "analytics.google.com", "plausible.io", "usefathom.com", "amplitude.com", "mixpanel.com", "segment.io", "heap.io", "posthog.com"].map((pattern) => ({ pattern, category: "Analytics" as const })),
  ...["doubleclick.net", "googleadservices.com", "googlesyndication.com", "adservice.google.com", "ads-twitter.com", "taboola.com", "outbrain.com", "quantserve.com", "scorecardresearch.com"].map((pattern) => ({ pattern, category: "Advertising" as const })),
  ...["connect.facebook.net", "facebook.com", "tiktok.com", "snap.licdn.com", "linkedin.com", "platform.twitter.com", "x.com", "pinterest.com"].map((pattern) => ({ pattern, category: "Social" as const })),
  ...["hotjar.com", "clarity.ms", "fullstory.com", "mouseflow.com", "luckyorange.com", "logrocket.com", "smartlook.com"].map((pattern) => ({ pattern, category: "Session replay" as const })),
  ...["googletagmanager.com", "tealiumiq.com", "tagcommander.com", "ensighten.com"].map((pattern) => ({ pattern, category: "Tag manager" as const })),
  ...["cloudflare.com", "cdnjs.cloudflare.com", "jsdelivr.net", "unpkg.com", "bootstrapcdn.com", "fonts.googleapis.com", "fonts.gstatic.com", "gstatic.com"].map((pattern) => ({ pattern, category: "CDN / functional" as const })),
];
