import type { CookieFinding, Risk } from "./types";

const trackingNames = /(_ga|_gid|_gcl|fbp|fbc|utm|track|analytics|amplitude|mixpanel|hubspot|clarity|nid|anid)/i;
const sessionNames = /(^|[_-])(session|sess|sid|auth|token|jwt|login|user|account)([_-]|$)/i;
const securityNames = /(^|[_-])(__host-|__secure-|csrf|xsrf|nonce|challenge|aec|secure|anti|abuse)([_-]|$)/i;
const preferenceNames = /(consent|pref|theme|locale|lang|soc|opt|settings|timezone)/i;

function categoryFor(name: string): CookieFinding["category"] {
  if (sessionNames.test(name)) return "session";
  if (securityNames.test(name)) return "security";
  if (trackingNames.test(name)) return "analytics";
  if (preferenceNames.test(name)) return "preference";
  return "unknown";
}

function highestRisk(risks: Risk[]): Risk {
  if (risks.includes("high")) return "high";
  if (risks.includes("medium")) return "medium";
  return "low";
}

export function analyzeCookies(setCookieHeaders: string[]): CookieFinding[] {
  return setCookieHeaders.slice(0, 50).map((header) => {
    const parts = header.split(";").map((part) => part.trim());
    const name = parts[0]?.split("=")[0] || "unnamed";
    const lower = parts.map((part) => part.toLowerCase());
    const secure = lower.includes("secure");
    const httpOnly = lower.includes("httponly");
    const sameSitePart = parts.find((part) => /^samesite=/i.test(part));
    const sameSite = sameSitePart?.split("=")[1] || null;
    const issues: string[] = [];
    const risks: Risk[] = [];
    const category = categoryFor(name);
    const sensitive = category === "session" || category === "security";

    if (!secure) {
      issues.push("Missing Secure flag");
      risks.push("high");
    }
    if (!httpOnly) {
      issues.push(sensitive ? "Sensitive cookie missing HttpOnly flag" : "Client-readable cookie");
      risks.push(sensitive ? "high" : category === "analytics" ? "medium" : "low");
    }
    if (!sameSite) {
      issues.push(sensitive ? "Sensitive cookie missing SameSite attribute" : "SameSite attribute not declared");
      risks.push(sensitive ? "medium" : "low");
    }
    if (sameSite?.toLowerCase() === "none" && !secure) {
      issues.push("SameSite=None without Secure");
      risks.push("high");
    }
    if (category === "analytics") {
      issues.push("Name resembles an analytics or tracking identifier");
      risks.push("medium");
    }
    if (parts.some((part) => /^domain=\./i.test(part))) {
      issues.push("Cookie is scoped to a broad parent domain");
      risks.push(sensitive ? "medium" : "low");
    }

    const expires = parts.find((part) => /^expires=/i.test(part));
    if (expires) {
      const expiry = Date.parse(expires.slice(expires.indexOf("=") + 1));
      if (Number.isFinite(expiry) && expiry - Date.now() > 365 * 24 * 60 * 60 * 1000) {
        issues.push("Expiration exceeds one year");
        risks.push(category === "analytics" ? "medium" : "low");
      }
    }

    const risk = highestRisk(risks);
    return {
      name,
      category,
      secure,
      httpOnly,
      sameSite,
      issues,
      risk,
      explanation: issues.length
        ? sensitive
          ? "A cookie that appears session or security related is missing a protective attribute."
          : "A non-session cookie has observable privacy or hygiene attributes worth reviewing."
        : "No obvious flag issues were detected.",
      recommendation: issues.length
        ? sensitive
          ? "Use Secure, HttpOnly, SameSite, narrow scope, and short retention for session or security cookies."
          : "Use the narrowest scope and retention that matches the cookie purpose; HttpOnly may not apply to client-side preference cookies."
        : "Continue reviewing cookie purpose and retention.",
    };
  });
}
