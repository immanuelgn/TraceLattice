"use client";

import type { RecentScan, ScanReport } from "./types";

const KEY = "tracelattice-recent-v1";

export function getRecentScans(): RecentScan[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveRecentScan(report: ScanReport) {
  const summary: RecentScan = {
    domain: report.domain,
    finalUrl: report.finalUrl,
    score: report.score.value,
    grade: report.score.grade,
    riskLabel: report.score.label,
    trackerCount: report.trackers.length,
    cookieIssueCount: report.cookies.filter((cookie) => cookie.issues.length).length,
    thirdPartyCount: report.thirdParties.length,
    scannedAt: report.scannedAt,
  };
  const next = [summary, ...getRecentScans().filter((item) => item.domain !== summary.domain)].slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function removeRecentScan(domain: string) {
  localStorage.setItem(KEY, JSON.stringify(getRecentScans().filter((item) => item.domain !== domain)));
}

export function clearRecentScans() {
  localStorage.removeItem(KEY);
}
