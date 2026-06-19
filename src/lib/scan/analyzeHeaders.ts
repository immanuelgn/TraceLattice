import type { HeaderFinding, Risk } from "./types";

const definitions = [
  ["Content-Security-Policy", "Restricts which resources the browser may load.", "Add a restrictive CSP with default-src and object-src directives."],
  ["Strict-Transport-Security", "Keeps supported browsers on HTTPS.", "Enable HSTS with a suitable max-age after confirming HTTPS coverage."],
  ["X-Frame-Options", "Helps prevent clickjacking in older browsers.", "Use CSP frame-ancestors or X-Frame-Options."],
  ["X-Content-Type-Options", "Prevents MIME type sniffing.", "Set X-Content-Type-Options: nosniff."],
  ["Referrer-Policy", "Controls how much referrer data leaves the site.", "Use a privacy-conscious policy such as strict-origin-when-cross-origin."],
  ["Permissions-Policy", "Limits access to sensitive browser features.", "Define a minimal Permissions-Policy for unused features."],
  ["Cross-Origin-Opener-Policy", "Isolates the top-level browsing context.", "Consider same-origin where compatible."],
  ["Cross-Origin-Resource-Policy", "Controls cross-origin resource loading.", "Set an appropriate same-site or same-origin policy."],
  ["Cross-Origin-Embedder-Policy", "Controls cross-origin embedding requirements.", "Consider require-corp only when application compatibility allows it."],
] as const;

export function analyzeHeaders(headers: Headers): HeaderFinding[] {
  const csp = headers.get("content-security-policy") || "";
  const cspLower = csp.toLowerCase();
  return definitions.map(([name, explanation, recommendation]) => {
    const value = headers.get(name);
    let risk: Risk = value ? "low" : ["Content-Security-Policy", "Strict-Transport-Security", "Referrer-Policy"].includes(name) ? "high" : "medium";

    if (name === "Content-Security-Policy" && value) {
      const hasBaseline = cspLower.includes("default-src") && /object-src\s+['"]?none['"]?/i.test(cspLower);
      const unsafeScript = /script-src[^;]*(?:'unsafe-inline'|'unsafe-eval'|\*)/i.test(cspLower);
      const broadDefault = /default-src[^;]*\*/i.test(cspLower);
      const unsafeStyle = /style-src[^;]*'unsafe-inline'/i.test(cspLower);
      risk = !hasBaseline || unsafeScript || broadDefault ? "high" : unsafeStyle || !cspLower.includes("base-uri") ? "medium" : "low";
    }
    if (name === "X-Frame-Options") {
      const protectedByCsp = /frame-ancestors\s+[^;]+/i.test(cspLower);
      risk = protectedByCsp || /^(deny|sameorigin)$/i.test(value || "") ? "low" : value ? "medium" : "high";
    }
    if (name === "X-Content-Type-Options") risk = value?.trim().toLowerCase() === "nosniff" ? "low" : "high";
    if (name === "Strict-Transport-Security" && value) {
      const maxAge = Number(value.match(/max-age=(\d+)/i)?.[1] || 0);
      risk = maxAge >= 31_536_000 && /includesubdomains/i.test(value) ? "low" : "medium";
    }
    if (name === "Referrer-Policy" && value) {
      risk = /^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/i.test(value.trim()) ? "low" : "medium";
    }
    if (name === "Permissions-Policy" && value) risk = value.includes("*") ? "medium" : "low";

    return { name, present: Boolean(value), value: value || undefined, risk, explanation, recommendation };
  });
}
