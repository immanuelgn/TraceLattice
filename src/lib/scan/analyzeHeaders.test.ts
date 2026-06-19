import { describe, expect, it } from "vitest";
import { analyzeHeaders } from "./analyzeHeaders";

describe("analyzeHeaders", () => {
  it("recognizes a strong baseline", () => {
    const findings = analyzeHeaders(new Headers({
      "content-security-policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      "strict-transport-security": "max-age=31536000",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=()",
    }));
    expect(findings.find((item) => item.name === "Content-Security-Policy")?.risk).toBe("low");
    expect(findings.find((item) => item.name === "X-Frame-Options")?.risk).toBe("low");
  });

  it("does not rate a permissive CSP as fully strong", () => {
    const findings = analyzeHeaders(new Headers({
      "content-security-policy": "default-src 'self'; object-src 'none'; base-uri 'self'; style-src 'self' 'unsafe-inline'",
    }));
    expect(findings.find((item) => item.name === "Content-Security-Policy")?.risk).toBe("medium");
  });
});
