import { describe, expect, it } from "vitest";
import { scorePrivacy } from "./scorePrivacy";

describe("scorePrivacy", () => {
  it("is deterministic and clamps to zero", () => {
    const result = scorePrivacy({
      https: false,
      redirectsToHttps: false,
      headers: [],
      cookies: Array.from({ length: 10 }, (_, index) => ({ name: `session_${index}`, category: "session" as const, secure: false, httpOnly: false, sameSite: null, issues: ["Missing Secure flag"], risk: "high" as const, explanation: "", recommendation: "" })),
      trackers: [
        { domain: "ads.test", category: "Advertising", evidence: ["script"], risk: "high" },
        { domain: "replay.test", category: "Session replay", evidence: ["script"], risk: "high" },
      ],
      thirdPartyCount: 30,
      externalScriptCount: 40,
      thirdPartyScriptCount: 12,
      functionalThirdPartyCount: 4,
      unknownThirdPartyCount: 5,
      crossDomainMetaRefresh: true,
    });
    expect(result.value).toBeLessThan(30);
    expect(result.grade).toBe("F");
    expect(result.components.headers.value).toBeLessThan(30);
  });

  it("penalizes a strong site that still delegates scripts and fonts to third parties", () => {
    const coreHeaders = [
      "Strict-Transport-Security",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ].map((name) => ({ name, present: true, value: "configured", risk: "low" as const, explanation: "", recommendation: "" }));
    const result = scorePrivacy({
      https: true,
      redirectsToHttps: true,
      headers: [
        { name: "Content-Security-Policy", present: true, value: "style-src 'unsafe-inline'", risk: "medium", explanation: "", recommendation: "" },
        ...coreHeaders,
      ],
      cookies: [],
      trackers: [],
      thirdPartyCount: 3,
      externalScriptCount: 3,
      thirdPartyScriptCount: 1,
      functionalThirdPartyCount: 3,
      unknownThirdPartyCount: 0,
      crossDomainMetaRefresh: false,
    });
    expect(result.value).toBeGreaterThanOrEqual(85);
    expect(result.value).toBeLessThan(100);
    expect(result.confidence).toBe("limited");
    expect(result.components.headers.value).toBeLessThan(100);
    expect(result.components.cookies.value).toBe(100);
  });

  it("keeps a Google-like homepage contextual instead of collapsing it to an absolute unsafe verdict", () => {
    const headers = [
      { name: "Content-Security-Policy", present: false, risk: "high" as const, explanation: "", recommendation: "" },
      { name: "Strict-Transport-Security", present: true, value: "max-age=31536000", risk: "medium" as const, explanation: "", recommendation: "" },
      { name: "X-Frame-Options", present: false, risk: "high" as const, explanation: "", recommendation: "" },
      { name: "X-Content-Type-Options", present: true, value: "nosniff", risk: "low" as const, explanation: "", recommendation: "" },
      { name: "Referrer-Policy", present: true, value: "origin", risk: "medium" as const, explanation: "", recommendation: "" },
      { name: "Permissions-Policy", present: false, risk: "high" as const, explanation: "", recommendation: "" },
    ];
    const result = scorePrivacy({
      https: true,
      redirectsToHttps: true,
      headers,
      cookies: [
        { name: "CONSENT", category: "preference", secure: true, httpOnly: false, sameSite: "None", issues: ["Client-readable cookie"], risk: "low", explanation: "", recommendation: "" },
        { name: "NID", category: "analytics", secure: true, httpOnly: true, sameSite: "None", issues: ["Name resembles an analytics or tracking identifier"], risk: "medium", explanation: "", recommendation: "" },
      ],
      trackers: [],
      thirdPartyCount: 0,
      externalScriptCount: 0,
      thirdPartyScriptCount: 0,
      functionalThirdPartyCount: 0,
      unknownThirdPartyCount: 0,
      crossDomainMetaRefresh: false,
    });

    expect(result.value).toBeGreaterThanOrEqual(60);
    expect(result.components.cookies.value).toBeGreaterThan(result.components.headers.value);
    expect(result.scopeNote).toContain("not a full security ranking");
  });
});
