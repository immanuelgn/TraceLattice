import type { TrackerCategory } from "@/lib/scan/types";
import patterns from "./trackerPatterns.json";

export interface TrackerPattern {
  pattern: string;
  category: TrackerCategory;
}

export const trackerPatterns = patterns as TrackerPattern[];
