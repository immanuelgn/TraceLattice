import { trackerPatterns } from "../../data/trackerPatterns";
import type { ResourceFinding, TrackerFinding, TrackerCategory } from "./types";

export function classifyDomain(domain: string): TrackerCategory {
  return trackerPatterns.find(({ pattern }) => domain === pattern || domain.endsWith(`.${pattern}`))?.category || "Unknown";
}

export function detectTrackers(resources: ResourceFinding[]): TrackerFinding[] {
  const grouped = new Map<string, { category: TrackerCategory; evidence: Set<string> }>();
  for (const resource of resources.filter((item) => item.thirdParty)) {
    const category = classifyDomain(resource.domain);
    if (category === "Unknown" || category === "CDN / functional") continue;
    const item = grouped.get(resource.domain) || { category, evidence: new Set<string>() };
    item.evidence.add(resource.type);
    grouped.set(resource.domain, item);
  }

  return [...grouped.entries()].map(([domain, item]) => ({
    domain,
    category: item.category,
    evidence: [...item.evidence],
    risk: ["Advertising", "Session replay"].includes(item.category) ? "high" : "medium",
  }));
}
