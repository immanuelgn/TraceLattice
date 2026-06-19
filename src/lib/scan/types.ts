export type Risk = "low" | "medium" | "high";

export interface HeaderFinding {
  name: string;
  present: boolean;
  value?: string;
  risk: Risk;
  explanation: string;
  recommendation: string;
}

export interface CookieFinding {
  name: string;
  category: "session" | "security" | "preference" | "analytics" | "unknown";
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  issues: string[];
  risk: Risk;
  explanation: string;
  recommendation: string;
}

export interface ResourceFinding {
  type: "script" | "iframe" | "image" | "link" | "form" | "meta-refresh";
  url: string;
  domain: string;
  thirdParty: boolean;
}

export interface TrackerFinding {
  domain: string;
  category: TrackerCategory;
  evidence: string[];
  risk: Risk;
}

export type TrackerCategory =
  | "Analytics"
  | "Advertising"
  | "Social"
  | "Session replay"
  | "Tag manager"
  | "CDN / functional"
  | "Unknown";

export interface ThirdPartyFinding {
  domain: string;
  category: TrackerCategory;
  resourceTypes: string[];
  count: number;
}

export interface ScorePenalty {
  label: string;
  points: number;
  reason: string;
}

export interface ScoreComponent {
  value: number;
  label: "Strong" | "Review" | "Weak";
  reasons: string[];
}

export interface ScanReport {
  scanId: string;
  inputUrl: string;
  normalizedUrl: string;
  finalUrl: string;
  domain: string;
  rootDomain: string;
  scannedAt: string;
  durationMs: number;
  statusCode: number;
  https: {
    enabled: boolean;
    redirectsToHttps: boolean;
    risk: Risk;
    notes: string[];
  };
  score: {
    value: number;
    grade: "A" | "B" | "C" | "D" | "F";
    label: "Excellent" | "Good" | "Moderate" | "Needs Review" | "Weak";
    confidence: "limited" | "moderate";
    scopeNote: string;
    summary: string;
    topReasons: string[];
    penalties: ScorePenalty[];
    positiveNotes: string[];
    components: {
      headers: ScoreComponent;
      cookies: ScoreComponent;
      exposure: ScoreComponent;
    };
  };
  headers: HeaderFinding[];
  cookies: CookieFinding[];
  trackers: TrackerFinding[];
  thirdParties: ThirdPartyFinding[];
  resources: ResourceFinding[];
  inlineScriptCount: number;
  externalScriptCount: number;
  recommendations: string[];
  limitations: string[];
}

export interface ParsedHtml {
  resources: Omit<ResourceFinding, "domain" | "thirdParty">[];
  inlineScriptCount: number;
  externalScriptCount: number;
  canonicalUrl?: string;
}

export interface RecentScan {
  domain: string;
  finalUrl: string;
  score: number;
  grade: string;
  riskLabel: string;
  trackerCount: number;
  cookieIssueCount: number;
  thirdPartyCount: number;
  scannedAt: string;
}
