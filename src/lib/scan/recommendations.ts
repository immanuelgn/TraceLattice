import type { CookieFinding, HeaderFinding, PostureFinding, TrackerFinding } from "./types";

export function buildRecommendations(headers: HeaderFinding[], cookies: CookieFinding[], trackers: TrackerFinding[], thirdPartyCount: number, posture: PostureFinding[] = []) {
  const recommendations = new Set<string>();
  headers.filter((header) => header.risk !== "low").forEach((header) => recommendations.add(header.recommendation));
  posture.filter((item) => item.risk !== "low").forEach((item) => recommendations.add(item.recommendation));
  if (cookies.some((cookie) => cookie.issues.length)) recommendations.add("Review cookie purpose and apply appropriate Secure, HttpOnly, SameSite, scope, and retention settings.");
  if (trackers.some((tracker) => ["Advertising", "Session replay"].includes(tracker.category))) recommendations.add("Remove non-essential advertising or session-replay integrations and verify consent requirements with qualified counsel.");
  if (trackers.some((tracker) => tracker.category === "Analytics")) recommendations.add("Review analytics necessity, retention, and whether a more privacy-preserving configuration is practical.");
  if (thirdPartyCount > 5) recommendations.add("Reduce and document third-party processors; each external domain expands the data-sharing and supply-chain surface.");
  recommendations.add("Document relevant third-party processing in your privacy notice and perform a full manual audit before making compliance claims.");
  return [...recommendations].slice(0, 8);
}
