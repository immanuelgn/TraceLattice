import type { TrackerCategory } from "@/lib/scan/types";
import patterns from "./trackerPatterns.json";

export interface TrackerPattern {
  pattern: string;
  category: TrackerCategory;
}

// The shared JSON list is used by both the hosted scanner and local runtime CLI.
export const trackerPatterns = patterns as TrackerPattern[];
