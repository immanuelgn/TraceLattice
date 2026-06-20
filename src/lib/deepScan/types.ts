import type { Risk, TrackerCategory } from "@/lib/scan/types";

export interface RuntimeRequest {
  url: string;
  domain: string;
  method: string;
  resourceType: string;
  status?: number;
  thirdParty: boolean;
  trackerCategory?: TrackerCategory;
}

export interface RuntimeCookie {
  name: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}

export interface RuntimeFinding {
  id: string;
  title: string;
  risk: Risk;
  confidence: "high" | "moderate";
  evidence: string;
  recommendation: string;
}

export interface DeepScanReport {
  schemaVersion: 1;
  source: "tracelattice-local-runtime";
  scanId: string;
  scannerVersion: string;
  targetUrl: string;
  finalUrl: string;
  rootDomain: string;
  title: string;
  startedAt: string;
  durationMs: number;
  browser: string;
  summary: {
    requests: number;
    thirdPartyDomains: number;
    trackerDomains: number;
    cookies: number;
    webSockets: number;
    consoleErrors: number;
    blockedRequests: number;
  };
  page: {
    scripts: number;
    inlineScripts: number;
    iframes: number;
    forms: number;
    images: number;
    links: number;
  };
  mainResponse: {
    status: number;
    headers: Record<string, string>;
  };
  requests: RuntimeRequest[];
  thirdParties: Array<{
    domain: string;
    requests: number;
    resourceTypes: string[];
    trackerCategory?: TrackerCategory;
  }>;
  cookies: RuntimeCookie[];
  storage: {
    localStorageKeys: string[];
    sessionStorageKeys: string[];
  };
  webSockets: string[];
  console: Array<{ type: "warning" | "error"; text: string }>;
  failedRequests: Array<{ url: string; reason: string }>;
  blockedRequests: Array<{ url: string; reason: string }>;
  findings: RuntimeFinding[];
  limitations: string[];
}
