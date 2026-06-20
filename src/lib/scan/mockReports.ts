import type { ScanReport } from "./types";
import { calculateWeightedScore, scoreBand } from "./scoring";

const limitations = [
  "Demo data uses a fictional domain and is not a live scan.",
  "Production scans sample up to three public same-origin HTML pages without executing target JavaScript.",
  "Dynamic resources may not be visible to static analysis.",
  "Scores are educational heuristics, not legal or compliance guarantees.",
];

function createMock(level: "low" | "medium" | "high"): ScanReport {
  const config = level === "low"
    ? { domain: "saas-baseline.example", title: "Modern SaaS baseline", third: 2, scripts: 3 }
    : level === "medium"
      ? { domain: "publisher-mix.example", title: "Content publisher mix", third: 7, scripts: 12 }
      : { domain: "legacy-portal.example", title: "Legacy portal exposure", third: 16, scripts: 29 };

  const risky = level !== "low";
  const headers = [
    ["Content-Security-Policy", level === "low", "Controls resource loading"],
    ["Strict-Transport-Security", level !== "high", "Keeps browsers on HTTPS"],
    ["X-Frame-Options", true, "Limits framing"],
    ["X-Content-Type-Options", true, "Prevents MIME sniffing"],
    ["Referrer-Policy", level === "low", "Limits outgoing referrer data"],
    ["Permissions-Policy", level === "low", "Limits browser features"],
    ["Cross-Origin-Opener-Policy", false, "Isolates browsing context"],
    ["Cross-Origin-Resource-Policy", false, "Controls resource sharing"],
    ["Cross-Origin-Embedder-Policy", false, "Controls cross-origin embedding"],
  ].map(([name, present, explanation]) => ({
    name: name as string,
    present: present as boolean,
    value: present ? (name === "X-Content-Type-Options" ? "nosniff" : "configured") : undefined,
    risk: present ? "low" as const : name === "Content-Security-Policy" ? "high" as const : "medium" as const,
    explanation: explanation as string,
    recommendation: `Review ${name}.`,
  }));

  const trackers = level === "low" ? [] : [
    { domain: "analytics.example-cdn.test", category: "Analytics" as const, evidence: ["script"], risk: "medium" as const },
    ...(level === "high" ? [
      { domain: "ads.example-network.test", category: "Advertising" as const, evidence: ["script", "iframe"], risk: "high" as const },
      { domain: "replay.example-telemetry.test", category: "Session replay" as const, evidence: ["script"], risk: "high" as const },
      { domain: "social.example-widget.test", category: "Social" as const, evidence: ["iframe"], risk: "medium" as const },
    ] : []),
  ];

  const thirdParties = Array.from({ length: config.third }, (_, index) => ({
    domain: index < trackers.length ? trackers[index].domain : `service-${index + 1}.example-cdn.test`,
    category: index < trackers.length ? trackers[index].category : index % 3 === 0 ? "CDN / functional" as const : "Unknown" as const,
    resourceTypes: index % 2 ? ["script"] : ["image", "link"],
    count: Math.max(1, 6 - index),
  }));
  const posture = [
    { category: "TLS" as const, name: "TLS certificate", status: "pass" as const, risk: "low" as const, value: "120 day(s) until expiration", explanation: "The HTTPS certificate was valid during this scan.", recommendation: "Continue monitoring certificate expiration." },
    { category: "DNS email" as const, name: "DMARC policy", status: level === "low" ? "pass" as const : "context" as const, risk: level === "low" ? "low" as const : "medium" as const, value: level === "low" ? "p=reject" : "p=none", explanation: "A DMARC policy was found for the root domain.", recommendation: "Move toward quarantine or reject after validating legitimate mail flows." },
    { category: "Vulnerability disclosure" as const, name: "security.txt", status: level === "high" ? "missing" as const : "pass" as const, risk: level === "high" ? "medium" as const : "low" as const, explanation: level === "high" ? "No usable security.txt file was found." : "A security.txt file was found.", recommendation: "Publish and maintain vulnerability disclosure contact information." },
    { category: "Page hygiene" as const, name: "Mixed content references", status: "pass" as const, risk: "low" as const, explanation: "No static mixed-content references were found.", recommendation: "Continue keeping static resources HTTPS-only." },
  ];
  const components = {
    headers: { value: level === "low" ? 94 : level === "medium" ? 71 : 45, label: level === "low" ? "Strong" as const : level === "medium" ? "Context" as const : "Weak" as const, reasons: risky ? ["Several recommended browser controls were not observed."] : ["Core static header controls look strong."] },
    cookies: { value: level === "low" ? 100 : level === "medium" ? 94 : 58, label: level === "high" ? "Weak" as const : "Strong" as const, reasons: risky ? ["Cookie attributes deserve contextual review."] : ["No Set-Cookie hygiene issues were observed."] },
    exposure: { value: level === "low" ? 92 : level === "medium" ? 66 : 28, label: level === "low" ? "Strong" as const : level === "medium" ? "Context" as const : "Weak" as const, reasons: risky ? ["Third-party services expand the observable trust surface."] : ["Low visible third-party exposure."] },
    advanced: { value: level === "low" ? 92 : level === "medium" ? 82 : 70, label: level === "low" ? "Strong" as const : "Context" as const, reasons: level === "low" ? ["DNS, TLS, disclosure, and page-hygiene checks look strong."] : ["Some DNS or disclosure signals need site context."] },
  };
  const score = calculateWeightedScore(components);
  const band = scoreBand(score);

  return {
    source: {
      kind: "demo",
      label: config.title,
      description: "Illustrative, internally consistent sample data. No external website was contacted.",
    },
    scanId: `demo-${level}`,
    inputUrl: `https://${config.domain}`,
    normalizedUrl: `https://${config.domain}/`,
    finalUrl: `https://${config.domain}/`,
    inspectedUrls: [`https://${config.domain}/`, `https://${config.domain}/privacy`, `https://${config.domain}/security`],
    domain: config.domain,
    rootDomain: config.domain,
    scannedAt: new Date().toISOString(),
    durationMs: 684,
    statusCode: 200,
    https: { enabled: true, redirectsToHttps: true, risk: "low", notes: ["Final response used HTTPS."] },
    score: {
      value: score,
      grade: band.grade,
      label: band.label,
      confidence: "limited",
      scopeNote: "Demo report: confidence is limited because static analysis does not execute JavaScript.",
      summary: level === "low" ? "Strong controls and limited third-party exposure." : level === "medium" ? "A mixed privacy posture with several gaps to review." : "Broad third-party exposure and multiple missing controls.",
      topReasons: risky
        ? ["Missing or weak browser security policies.", "Third-party services expand the observable data-sharing surface.", "Cookie or tracker configuration deserves review."]
        : ["Optional cross-origin isolation policies were not observed.", "Runtime and consent-dependent behavior remains outside this static scan.", "Third-party dependencies should still be reviewed during releases."],
      penalties: risky ? [
        { label: "Security headers", points: level === "high" ? 28 : 15, reason: "Several recommended controls were not observed." },
        { label: "Third parties", points: level === "high" ? 22 : 6, reason: "External domains increase the trust surface." },
        { label: "Trackers", points: level === "high" ? 12 : 5, reason: "Known categories were detected in static references." },
      ] : [{ label: "Minor hardening", points: 6, reason: "Optional cross-origin policies were not observed." }],
      positiveNotes: ["HTTPS is enabled.", ...(level === "low" ? ["No known trackers were detected.", "Low third-party exposure."] : [])],
      components,
    },
    headers,
    cookies: risky ? [{
      name: level === "high" ? "_analytics_id" : "preferences",
      category: level === "high" ? "analytics" : "preference",
      secure: level !== "high",
      httpOnly: false,
      sameSite: level === "high" ? null : "Lax",
      issues: level === "high" ? ["Missing Secure flag", "Client-readable cookie", "SameSite attribute not declared"] : ["Client-readable cookie"],
      risk: level === "high" ? "high" : "medium",
      explanation: "Observable cookie flags deserve review.",
      recommendation: "Apply the narrowest appropriate flags and scope.",
    }] : [],
    trackers,
    thirdParties,
    posture,
    resources: thirdParties.map((item) => ({ type: "script", url: `https://${item.domain}/asset.js`, domain: item.domain, thirdParty: true })),
    inlineScriptCount: level === "high" ? 17 : 4,
    externalScriptCount: config.scripts,
    recommendations: level === "low"
      ? [
        "Review optional cross-origin isolation headers for application compatibility.",
        "Continue monitoring certificate and DNS posture.",
        "Revalidate third-party dependencies during releases.",
        "Use consented runtime tooling for behavior static analysis cannot observe.",
      ]
      : [
        "Add or strengthen Content-Security-Policy.",
        "Reduce non-essential third-party scripts.",
        "Review cookie scope, retention, and security flags.",
        "Document third-party processing and complete a manual privacy review.",
      ],
    limitations,
  };
}

export const mockReports = {
  low: createMock("low"),
  medium: createMock("medium"),
  high: createMock("high"),
};
