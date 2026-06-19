import type { CookieFinding, HeaderFinding, ScorePenalty, TrackerFinding } from "./types";

interface ScoreInput {
  https: boolean;
  redirectsToHttps: boolean;
  headers: HeaderFinding[];
  cookies: CookieFinding[];
  trackers: TrackerFinding[];
  thirdPartyCount: number;
  externalScriptCount: number;
  thirdPartyScriptCount: number;
  functionalThirdPartyCount: number;
  unknownThirdPartyCount: number;
  crossDomainMetaRefresh: boolean;
}

function componentLabel(value: number) {
  return value >= 80 ? "Strong" as const : value >= 60 ? "Context" as const : "Weak" as const;
}

function cap(points: number, max: number) {
  return Math.min(max, points);
}

export function scorePrivacy(input: ScoreInput) {
  const penalties: ScorePenalty[] = [];
  const add = (label: string, points: number, reason: string) => penalties.push({ label, points, reason });
  const headerRisk = (name: string) => input.headers.find((header) => header.name === name)?.risk;
  const headerReasons: string[] = [];
  const cookieReasons: string[] = [];
  const exposureReasons: string[] = [];
  const headerPenalty = (label: string, points: number, reason: string) => {
    add(label, points, reason);
    headerReasons.push(reason);
    return points;
  };
  const cookiePenalty = (label: string, points: number, reason: string) => {
    add(label, points, reason);
    cookieReasons.push(reason);
    return points;
  };
  const exposurePenalty = (label: string, points: number, reason: string) => {
    add(label, points, reason);
    exposureReasons.push(reason);
    return points;
  };

  let headersScore = 100;
  let cookiesScore = 100;
  let exposureScore = 100;

  if (!input.https) headersScore -= headerPenalty("HTTPS unavailable", 25, "The final page was not served over HTTPS.");
  if (!input.redirectsToHttps) headersScore -= headerPenalty("HTTPS redirect uncertain", 6, "The scan could not confirm an HTTP-to-HTTPS upgrade.");

  if (headerRisk("Content-Security-Policy") === "high" || !headerRisk("Content-Security-Policy")) {
    headersScore -= headerPenalty("Missing or unsafe CSP", 18, "A protective Content-Security-Policy baseline was not observed.");
  } else if (headerRisk("Content-Security-Policy") === "medium") {
    headersScore -= headerPenalty("CSP hardening", 8, "The CSP is useful but contains permissive or incomplete directives.");
  }

  if (input.https && (headerRisk("Strict-Transport-Security") === "high" || !headerRisk("Strict-Transport-Security"))) {
    headersScore -= headerPenalty("Missing HSTS", 14, "Strict HTTPS transport was not confirmed.");
  } else if (headerRisk("Strict-Transport-Security") === "medium") {
    headersScore -= headerPenalty("HSTS hardening", 6, "HSTS is present but does not meet the stronger baseline.");
  }

  if (headerRisk("X-Frame-Options") === "high" || !headerRisk("X-Frame-Options")) {
    headersScore -= headerPenalty("Clickjacking protection", 10, "No effective frame protection was observed.");
  } else if (headerRisk("X-Frame-Options") === "medium") {
    headersScore -= headerPenalty("Clickjacking hardening", 5, "Frame protection is present but not clearly effective.");
  }

  if (headerRisk("X-Content-Type-Options") !== "low") headersScore -= headerPenalty("MIME sniffing protection", 7, "nosniff was not observed.");

  if (headerRisk("Referrer-Policy") === "high" || !headerRisk("Referrer-Policy")) {
    headersScore -= headerPenalty("Referrer privacy", 8, "A privacy-conscious referrer policy was not observed.");
  } else if (headerRisk("Referrer-Policy") === "medium") {
    headersScore -= headerPenalty("Referrer policy hardening", 4, "The observed referrer policy may disclose more context than necessary.");
  }

  if (headerRisk("Permissions-Policy") === "high" || !headerRisk("Permissions-Policy")) {
    headersScore -= headerPenalty("Browser feature policy", 4, "Permissions-Policy was not observed.");
  } else if (headerRisk("Permissions-Policy") === "medium") {
    headersScore -= headerPenalty("Permissions policy hardening", 2, "The Permissions-Policy appears broad or incomplete.");
  }

  const highCookies = input.cookies.filter((cookie) => cookie.risk === "high").length;
  const mediumCookies = input.cookies.filter((cookie) => cookie.risk === "medium").length;
  const lowCookies = input.cookies.filter((cookie) => cookie.risk === "low" && cookie.issues.length).length;
  const sensitiveCookieIssues = input.cookies.filter((cookie) => ["session", "security"].includes(cookie.category) && cookie.issues.length).length;
  if (highCookies) cookiesScore -= cookiePenalty("High-risk cookie attributes", cap(highCookies * 14, 42), `${highCookies} cookie(s) have high-priority flag concerns.`);
  if (mediumCookies) cookiesScore -= cookiePenalty("Cookie privacy attributes", cap(mediumCookies * 6, 24), `${mediumCookies} cookie(s) deserve configuration review.`);
  if (lowCookies) cookiesScore -= cookiePenalty("Low-context cookie hygiene", cap(lowCookies * 2, 8), `${lowCookies} lower-risk cookie hygiene signal(s) were observed.`);
  if (sensitiveCookieIssues) cookieReasons.unshift(`${sensitiveCookieIssues} sensitive-looking cookie(s) deserve manual review first.`);

  const categories = new Set(input.trackers.map((tracker) => tracker.category));
  if (categories.has("Advertising")) exposureScore -= exposurePenalty("Advertising technology", 12, "Static references indicate advertising technology.");
  if (categories.has("Session replay")) exposureScore -= exposurePenalty("Session replay", 12, "Static references indicate behavior or session replay tooling.");
  if (categories.has("Social")) exposureScore -= exposurePenalty("Social tracking", 8, "Static references indicate social platform integrations.");
  if (categories.has("Analytics")) exposureScore -= exposurePenalty("Analytics", 5, "Static references indicate analytics tooling.");

  if (input.thirdPartyCount > 20) exposureScore -= exposurePenalty("Broad third-party exposure", 18, `${input.thirdPartyCount} third-party domains were observed.`);
  else if (input.thirdPartyCount > 10) exposureScore -= exposurePenalty("Elevated third-party exposure", 12, `${input.thirdPartyCount} third-party domains were observed.`);
  else if (input.thirdPartyCount > 5) exposureScore -= exposurePenalty("Third-party exposure", 6, `${input.thirdPartyCount} third-party domains were observed.`);

  if (input.functionalThirdPartyCount) {
    exposureScore -= exposurePenalty("Functional third-party sharing", cap(input.functionalThirdPartyCount, 6), `${input.functionalThirdPartyCount} CDN, font, or functional provider domain(s) receive browser requests.`);
  }
  if (input.unknownThirdPartyCount) {
    exposureScore -= exposurePenalty("Unclassified third parties", cap(input.unknownThirdPartyCount * 2, 10), `${input.unknownThirdPartyCount} third-party domain(s) could not be confidently categorized.`);
  }
  if (input.thirdPartyScriptCount) {
    exposureScore -= exposurePenalty("Third-party script trust", cap(input.thirdPartyScriptCount * 5, 18), `${input.thirdPartyScriptCount} script(s) execute from third-party origins.`);
  }

  if (input.externalScriptCount > 25) exposureScore -= exposurePenalty("High external script count", 10, `${input.externalScriptCount} external scripts increase the trust surface.`);
  else if (input.externalScriptCount > 12) exposureScore -= exposurePenalty("External script count", 5, `${input.externalScriptCount} external scripts were observed.`);
  if (input.crossDomainMetaRefresh) exposureScore -= exposurePenalty("Cross-domain meta refresh", 5, "The static page appears to redirect visitors to another domain.");

  headersScore = Math.max(0, Math.min(100, Math.round(headersScore)));
  cookiesScore = Math.max(0, Math.min(100, Math.round(cookiesScore)));
  exposureScore = Math.max(0, Math.min(100, Math.round(exposureScore)));
  const value = Math.max(0, Math.min(100, Math.round(headersScore * 0.45 + cookiesScore * 0.25 + exposureScore * 0.3)));
  const grade = value >= 90 ? "A" : value >= 80 ? "B" : value >= 70 ? "C" : value >= 60 ? "D" : "F";
  const label = value >= 90 ? "Excellent" : value >= 80 ? "Good" : value >= 70 ? "Mixed Static Signals" : value >= 60 ? "Context Required" : "Weak";
  const positiveNotes = [
    ...(input.https ? ["The final page uses HTTPS."] : []),
    ...(headerRisk("Content-Security-Policy") === "low" ? ["A strong Content-Security-Policy baseline was observed."] : []),
    ...(headerRisk("Strict-Transport-Security") === "low" ? ["A strong HSTS baseline was observed."] : []),
    ...(input.trackers.length === 0 ? ["No known trackers were identified in static references."] : []),
    ...(input.cookies.length === 0 ? ["No Set-Cookie headers were observed."] : []),
    ...(input.thirdPartyCount === 0 ? ["No third-party domains were observed in static references."] : []),
  ];
  const components = {
    headers: {
      value: headersScore,
      label: componentLabel(headersScore),
      reasons: headerReasons.length ? headerReasons.slice(0, 3) : ["Core static header controls look strong in the observed response."],
    },
    cookies: {
      value: cookiesScore,
      label: componentLabel(cookiesScore),
      reasons: cookieReasons.length ? [...new Set(cookieReasons)].slice(0, 3) : ["No Set-Cookie hygiene issues were observed in the response."],
    },
    exposure: {
      value: exposureScore,
      label: componentLabel(exposureScore),
      reasons: exposureReasons.length ? exposureReasons.slice(0, 3) : ["No known tracker or third-party exposure was visible in static HTML."],
    },
  };

  return {
    value,
    grade,
    label,
    confidence: "limited" as const,
    scopeNote: "This is not a full security ranking. Confidence is limited because the scan does not execute JavaScript, crawl pages, authenticate, or inspect runtime network activity.",
    summary: value >= 90
      ? "Very strong observed static baseline, with static-analysis limitations still applying."
      : value >= 80
        ? "Good observed static baseline with a small number of trust or hardening gaps."
        : value >= 60
          ? "Mixed static signals were observed; interpret the findings with site purpose, scale, and runtime context."
          : "The static homepage exposes multiple observable posture concerns that need manual review.",
    topReasons: penalties.slice().sort((a, b) => b.points - a.points).slice(0, 3).map((item) => item.reason),
    penalties,
    positiveNotes,
    components,
  } as const;
}
