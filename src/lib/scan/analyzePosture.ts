import { resolveAny, resolveCaa, resolveMx, resolveTxt } from "node:dns/promises";
import * as tls from "node:tls";
import type { PostureFinding, ResourceFinding, Risk } from "./types";
import { validatePublicUrl } from "./validateUrl";

const SECURITY_TXT_LIMIT = 200_000;
const DISCOVERY_FILE_LIMIT = 120_000;

function finding(input: PostureFinding): PostureFinding {
  return input;
}

function textRecordIncludes(records: string[][], prefix: string) {
  return records.map((parts) => parts.join("")).find((value) => value.toLowerCase().startsWith(prefix));
}

function dnsValue(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value.join(", ") : value;
}

function hasSpfHardFail(spf?: string) {
  return /\s-all(?:\s|$)/i.test(spf || "");
}

function hasSpfOverbroadPass(spf?: string) {
  return /\s\+all(?:\s|$)|(?:^|\s)all(?:\s|$)/i.test(spf || "");
}

async function checkTls(hostname: string, enabled: boolean): Promise<PostureFinding[]> {
  if (!enabled) {
    return [finding({
      category: "TLS",
      name: "TLS certificate",
      status: "fail",
      risk: "high",
      explanation: "The final page was not served over HTTPS, so certificate posture could not be validated.",
      recommendation: "Serve the site over HTTPS with a valid certificate chain.",
    })];
  }

  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 4_000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      const validTo = cert.valid_to ? Date.parse(cert.valid_to) : Number.NaN;
      const days = Number.isFinite(validTo) ? Math.round((validTo - Date.now()) / 86_400_000) : null;
      const risk: Risk = days === null || days < 0 ? "high" : days < 30 ? "medium" : "low";
      resolve([finding({
        category: "TLS",
        name: "TLS certificate",
        status: risk === "high" ? "fail" : risk === "medium" ? "context" : "pass",
        risk,
        value: days === null ? "Certificate date unavailable" : `${days} day(s) until expiration`,
        explanation: risk === "low" ? "The HTTPS certificate was valid during this scan." : "The HTTPS certificate needs manual validation.",
        recommendation: risk === "low" ? "Continue monitoring certificate expiration." : "Renew or investigate the certificate before it affects availability or trust.",
      })]);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve([finding({
        category: "TLS",
        name: "TLS certificate",
        status: "context",
        risk: "medium",
        explanation: "TLS certificate validation timed out during the bounded scan.",
        recommendation: "Manually verify TLS certificate health and supported protocol configuration.",
      })]);
    });

    socket.on("error", () => {
      resolve([finding({
        category: "TLS",
        name: "TLS certificate",
        status: "fail",
        risk: "high",
        explanation: "The scanner could not establish a trusted TLS connection to port 443.",
        recommendation: "Verify certificate validity, hostname coverage, chain configuration, and HTTPS availability.",
      })]);
    });
  });
}

async function checkDns(rootDomain: string): Promise<PostureFinding[]> {
  const [txtResult, dmarcResult, mxResult, caaResult, dsResult, mtaStsResult, tlsRptResult] = await Promise.allSettled([
    resolveTxt(rootDomain),
    resolveTxt(`_dmarc.${rootDomain}`),
    resolveMx(rootDomain),
    resolveCaa(rootDomain),
    resolveAny(rootDomain),
    resolveTxt(`_mta-sts.${rootDomain}`),
    resolveTxt(`_smtp._tls.${rootDomain}`),
  ]);

  const txt = txtResult.status === "fulfilled" ? txtResult.value : [];
  const dmarc = dmarcResult.status === "fulfilled" ? dmarcResult.value : [];
  const mx = mxResult.status === "fulfilled" ? mxResult.value : [];
  const caa = caaResult.status === "fulfilled" ? caaResult.value : [];
  const ds = dsResult.status === "fulfilled" && Array.isArray(dsResult.value) ? dsResult.value.filter((record) => (record as { type?: string }).type === "DS") : [];
  const mtaSts = mtaStsResult.status === "fulfilled" ? mtaStsResult.value : [];
  const tlsRpt = tlsRptResult.status === "fulfilled" ? tlsRptResult.value : [];
  const spf = textRecordIncludes(txt, "v=spf1");
  const dmarcRecord = textRecordIncludes(dmarc, "v=dmarc1");
  const dmarcLower = dmarcRecord?.toLowerCase() || "";
  const dmarcPolicy = dmarcLower.match(/(?:^|;)\s*p\s*=\s*([^;]+)/)?.[1]?.trim();
  const dmarcPct = dmarcLower.match(/(?:^|;)\s*pct\s*=\s*(\d+)/)?.[1]?.trim();
  const hasMtaSts = Boolean(textRecordIncludes(mtaSts, "v=stsv1"));
  const hasTlsRpt = Boolean(textRecordIncludes(tlsRpt, "v=tlsrptv1"));
  const spfRisk: Risk = !spf ? "medium" : hasSpfOverbroadPass(spf) ? "high" : hasSpfHardFail(spf) ? "low" : "medium";
  const spfStatus = !spf ? "context" : spfRisk === "high" ? "fail" : spfRisk === "low" ? "pass" : "context";
  const dmarcEnforced = dmarcPolicy === "reject" || dmarcPolicy === "quarantine";
  const dmarcPartial = dmarcPct && Number(dmarcPct) < 100;

  return [
    finding({
      category: "DNS email",
      name: "SPF record",
      status: spfStatus,
      risk: spfRisk,
      value: spf ? dnsValue(spf) : undefined,
      explanation: !spf ? "No SPF TXT record was found for the root domain." : hasSpfOverbroadPass(spf) ? "An SPF record was found but appears to allow any sender." : hasSpfHardFail(spf) ? "An SPF TXT record with a hard-fail policy was found for the root domain." : "An SPF TXT record was found but does not end in a strict hard-fail policy.",
      recommendation: !spf ? "If this domain sends email, publish an SPF record that only authorizes expected senders." : hasSpfOverbroadPass(spf) ? "Remove +all or all mechanisms that authorize arbitrary senders." : "Review SPF includes periodically and move toward -all when legitimate mail flows are validated.",
    }),
    finding({
      category: "DNS email",
      name: "DMARC policy",
      status: dmarcRecord ? dmarcEnforced && !dmarcPartial ? "pass" : "context" : "missing",
      risk: dmarcRecord ? dmarcEnforced && !dmarcPartial ? "low" : "medium" : "medium",
      value: dmarcRecord ? dnsValue(dmarcRecord) : undefined,
      explanation: dmarcRecord ? `A DMARC policy was found with p=${dmarcPolicy || "unknown"}${dmarcPartial ? ` and pct=${dmarcPct}` : ""}.` : "No DMARC policy was found at _dmarc for the root domain.",
      recommendation: dmarcRecord ? "Move toward quarantine or reject at pct=100 after validating legitimate mail flows." : "If this domain sends email, publish DMARC to reduce spoofing risk and collect reports.",
    }),
    finding({
      category: "DNS email",
      name: "MX records",
      status: mx.length ? "pass" : "context",
      risk: mx.length ? "low" : "medium",
      value: mx.length ? mx.map((record) => `${record.exchange} (${record.priority})`).join(", ") : undefined,
      explanation: mx.length ? "MX records were found for the root domain." : "No MX records were found for the root domain.",
      recommendation: mx.length ? "Keep mail routing aligned with SPF, DKIM, and DMARC." : "If the domain does not send or receive mail, consider documenting that intentionally with restrictive email-auth records.",
    }),
    finding({
      category: "TLS",
      name: "CAA records",
      status: caa.length ? "pass" : "context",
      risk: caa.length ? "low" : "medium",
      value: caa.length ? caa.map((record) => Object.entries(record).map(([key, value]) => `${key}=${value}`).join(" ")).join(", ") : undefined,
      explanation: caa.length ? "CAA records constrain which certificate authorities may issue certificates." : "No CAA records were found for the root domain.",
      recommendation: caa.length ? "Keep CAA records aligned with certificate automation." : "Consider publishing CAA records to reduce unauthorized certificate issuance risk.",
    }),
    finding({
      category: "DNS integrity",
      name: "DNSSEC delegation",
      status: ds.length ? "pass" : "context",
      risk: ds.length ? "low" : "medium",
      value: ds.length ? `${ds.length} DS record(s)` : undefined,
      explanation: ds.length ? "DS records were found, indicating DNSSEC delegation at the parent zone." : "No DS records were found for the root domain.",
      recommendation: ds.length ? "Monitor DNSSEC key rotation and registrar alignment." : "Consider DNSSEC signing for stronger DNS integrity if supported by the registrar/DNS provider.",
    }),
    finding({
      category: "DNS email",
      name: "MTA-STS policy signal",
      status: hasMtaSts ? "pass" : "context",
      risk: hasMtaSts ? "low" : "medium",
      value: hasMtaSts ? textRecordIncludes(mtaSts, "v=stsv1") : undefined,
      explanation: hasMtaSts ? "An MTA-STS TXT policy signal was found." : "No MTA-STS TXT policy signal was found.",
      recommendation: hasMtaSts ? "Keep the HTTPS MTA-STS policy hosted and aligned with MX records." : "If this domain receives email, consider MTA-STS to improve SMTP transport security.",
    }),
    finding({
      category: "DNS email",
      name: "TLS reporting signal",
      status: hasTlsRpt ? "pass" : "context",
      risk: hasTlsRpt ? "low" : "medium",
      value: hasTlsRpt ? textRecordIncludes(tlsRpt, "v=tlsrptv1") : undefined,
      explanation: hasTlsRpt ? "A TLS-RPT TXT record was found for SMTP transport reporting." : "No TLS-RPT TXT record was found.",
      recommendation: hasTlsRpt ? "Review reports for failed SMTP TLS delivery attempts." : "If this domain receives email, consider TLS-RPT to observe SMTP TLS delivery issues.",
    }),
  ];
}

async function checkSecurityTxt(origin: URL): Promise<PostureFinding[]> {
  if (origin.protocol !== "https:") {
    return [finding({
      category: "Vulnerability disclosure",
      name: "security.txt",
      status: "missing",
      risk: "medium",
      explanation: "security.txt was not checked because the final origin is not HTTPS.",
      recommendation: "Host a security.txt file over HTTPS at /.well-known/security.txt.",
    })];
  }

  try {
    const url = await validatePublicUrl(new URL("/.well-known/security.txt", origin).toString());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3_500);
    try {
      const response = await fetch(url, {
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: { "User-Agent": "TraceLatticeBot/1.0 DefensiveSecurityReview", Accept: "text/plain,*/*;q=0.2" },
      });
      if (!response.ok || !response.body) {
        return [finding({
          category: "Vulnerability disclosure",
          name: "security.txt",
          status: "missing",
          risk: "medium",
          explanation: "No usable security.txt file was found at the well-known location.",
          recommendation: "Publish /.well-known/security.txt with contact and policy information for vulnerability reports.",
        })];
      }
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > SECURITY_TXT_LIMIT) {
        return [finding({
          category: "Vulnerability disclosure",
          name: "security.txt",
          status: "context",
          risk: "medium",
          explanation: "security.txt was larger than the bounded scan limit.",
          recommendation: "Keep security.txt concise and manually verify the disclosure contact information.",
        })];
      }
      const body = await response.text();
      const sample = body.slice(0, SECURITY_TXT_LIMIT);
      const hasContact = /^contact:/im.test(sample);
      const hasExpires = /^expires:/im.test(sample);
      return [finding({
        category: "Vulnerability disclosure",
        name: "security.txt",
        status: hasContact ? "pass" : "context",
        risk: hasContact ? hasExpires ? "low" : "medium" : "medium",
        value: [hasContact && "Contact", hasExpires && "Expires"].filter(Boolean).join(", ") || "No standard fields detected",
        explanation: hasContact ? "A security.txt file was found at the well-known location." : "A security.txt response was found but did not include a Contact field.",
        recommendation: hasContact && hasExpires ? "Keep security.txt current and aligned with disclosure policy." : "Include Contact and Expires fields, and optionally Policy and Acknowledgments.",
      })];
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return [finding({
      category: "Vulnerability disclosure",
      name: "security.txt",
      status: "context",
      risk: "medium",
      explanation: "security.txt could not be fetched within the bounded scan.",
      recommendation: "Manually confirm vulnerability disclosure contact information is published and reachable.",
    })];
  }
}

async function checkDiscoveryFiles(origin: URL): Promise<PostureFinding[]> {
  if (origin.protocol !== "https:") return [];
  const checks = [
    { path: "/robots.txt", name: "robots.txt" },
    { path: "/sitemap.xml", name: "sitemap.xml" },
  ];

  const results = await Promise.all(checks.map(async (check) => {
    try {
      const url = await validatePublicUrl(new URL(check.path, origin).toString());
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2_500);
      try {
        const response = await fetch(url, {
          redirect: "manual",
          cache: "no-store",
          signal: controller.signal,
          headers: { "User-Agent": "TraceLatticeBot/1.0 DefensiveSecurityReview", Accept: "text/plain,application/xml,*/*;q=0.2" },
        });
        const length = Number(response.headers.get("content-length") || 0);
        const present = response.ok && length <= DISCOVERY_FILE_LIMIT;
        return finding({
          category: "Discovery",
          name: check.name,
          status: present ? "pass" : "context",
          risk: "low",
          value: present ? "Published" : undefined,
          explanation: present ? `${check.name} was found at the conventional location.` : `${check.name} was not found or was outside the bounded scan limit.`,
          recommendation: present ? "Ensure discovery files do not expose sensitive, private, or administrative paths." : "This is usually acceptable; document intentionally hidden routes through normal access controls, not robots.txt.",
        });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return finding({
        category: "Discovery",
        name: check.name,
        status: "context",
        risk: "low",
        explanation: `${check.name} could not be checked within the bounded scan.`,
        recommendation: "Manually confirm public discovery files do not reveal sensitive paths.",
      });
    }
  }));

  return results;
}

function checkPageHygiene(finalUrl: string, resources: ResourceFinding[], inlineScriptCount: number, inlineEventHandlerCount: number, inlineScriptRiskCount: number): PostureFinding[] {
  const final = new URL(finalUrl);
  const mixed = final.protocol === "https:" ? resources.filter((resource) => resource.url.startsWith("http:")) : [];
  const activeMixed = mixed.filter((resource) => ["script", "iframe", "form"].includes(resource.type));
  const crossDomainForms = resources.filter((resource) => resource.type === "form" && resource.thirdParty);
  const passwordForms = resources.filter((resource) => resource.type === "form" && resource.inputTypes?.includes("password"));
  const weakPasswordAutocomplete = passwordForms.filter((resource) => resource.autocomplete !== "off");
  const thirdPartyScriptsWithoutSri = resources.filter((resource) => resource.thirdParty && resource.type === "script" && !resource.integrity);
  const thirdPartyStylesWithoutSri = resources.filter((resource) => resource.thirdParty && resource.type === "link" && (resource.rel || "").includes("stylesheet") && !resource.integrity);
  const blankTargetsWithoutNoopener = resources.filter((resource) => resource.type === "anchor" && resource.target?.toLowerCase() === "_blank" && !/\b(noopener|noreferrer)\b/i.test(resource.rel || ""));
  return [
    finding({
      category: "Page hygiene",
      name: "Mixed content references",
      status: mixed.length ? activeMixed.length ? "fail" : "context" : "pass",
      risk: activeMixed.length ? "high" : mixed.length ? "medium" : "low",
      value: mixed.length ? `${mixed.length} static HTTP reference(s)` : undefined,
      explanation: mixed.length ? "HTTP references were found in a page served over HTTPS." : "No static mixed-content references were found.",
      recommendation: mixed.length ? "Use HTTPS for all scripts, frames, forms, images, and preload references." : "Continue keeping static resources HTTPS-only.",
    }),
    finding({
      category: "Page hygiene",
      name: "Cross-domain forms",
      status: crossDomainForms.length ? "context" : "pass",
      risk: crossDomainForms.length ? "medium" : "low",
      value: crossDomainForms.length ? `${crossDomainForms.length} third-party form action(s)` : undefined,
      explanation: crossDomainForms.length ? "Static forms submit to a different root domain." : "No third-party form actions were found in static HTML.",
      recommendation: crossDomainForms.length ? "Confirm third-party form processors, privacy notices, CSRF handling, and data-processing agreements." : "Continue reviewing form handling during manual audits.",
    }),
    finding({
      category: "Page hygiene",
      name: "Inline script volume",
      status: inlineScriptCount > 25 ? "context" : "pass",
      risk: inlineScriptCount > 25 ? "medium" : "low",
      value: `${inlineScriptCount} inline script block(s)`,
      explanation: inlineScriptCount > 25 ? "A high number of inline script blocks increases review complexity." : "Inline script volume was not unusually high in the static document.",
      recommendation: inlineScriptCount > 25 ? "Review whether CSP nonces/hashes and script consolidation can reduce inline script risk." : "Continue pairing inline script usage with an appropriate CSP strategy.",
    }),
    finding({
      category: "Client-side risk",
      name: "Inline event handlers",
      status: inlineEventHandlerCount ? "context" : "pass",
      risk: inlineEventHandlerCount ? "medium" : "low",
      value: inlineEventHandlerCount ? `${inlineEventHandlerCount} inline handler(s)` : undefined,
      explanation: inlineEventHandlerCount ? "Inline event handler attributes were found in static HTML." : "No common inline event-handler attributes were found.",
      recommendation: inlineEventHandlerCount ? "Move event handlers into reviewed scripts and pair them with CSP nonces or hashes." : "Continue avoiding inline event handlers.",
    }),
    finding({
      category: "Client-side risk",
      name: "Dangerous inline JavaScript patterns",
      status: inlineScriptRiskCount ? "context" : "pass",
      risk: inlineScriptRiskCount ? "medium" : "low",
      value: inlineScriptRiskCount ? `${inlineScriptRiskCount} pattern match(es)` : undefined,
      explanation: inlineScriptRiskCount ? "Static inline JavaScript contains patterns commonly reviewed during XSS and data-exposure audits." : "No common high-review inline JavaScript patterns were found.",
      recommendation: inlineScriptRiskCount ? "Manually review eval-like execution, document.write, innerHTML sinks, and browser storage usage." : "Continue reviewing script changes through normal secure code review.",
    }),
    finding({
      category: "Supply chain",
      name: "Third-party script SRI",
      status: thirdPartyScriptsWithoutSri.length ? "context" : "pass",
      risk: thirdPartyScriptsWithoutSri.length ? "medium" : "low",
      value: thirdPartyScriptsWithoutSri.length ? `${thirdPartyScriptsWithoutSri.length} third-party script(s) without integrity` : undefined,
      explanation: thirdPartyScriptsWithoutSri.length ? "Third-party scripts were loaded without Subresource Integrity attributes." : "No third-party scripts without SRI were visible in static HTML.",
      recommendation: thirdPartyScriptsWithoutSri.length ? "Use SRI for stable third-party scripts where practical, or document why dynamic providers cannot use fixed hashes." : "Continue limiting third-party script trust and using SRI where practical.",
    }),
    finding({
      category: "Supply chain",
      name: "Third-party stylesheet SRI",
      status: thirdPartyStylesWithoutSri.length ? "context" : "pass",
      risk: thirdPartyStylesWithoutSri.length ? "medium" : "low",
      value: thirdPartyStylesWithoutSri.length ? `${thirdPartyStylesWithoutSri.length} third-party stylesheet(s) without integrity` : undefined,
      explanation: thirdPartyStylesWithoutSri.length ? "Third-party stylesheets were loaded without Subresource Integrity attributes." : "No third-party stylesheets without SRI were visible in static HTML.",
      recommendation: thirdPartyStylesWithoutSri.length ? "Use SRI for stable third-party stylesheets where practical." : "Continue limiting third-party stylesheet dependencies.",
    }),
    finding({
      category: "Forms",
      name: "Password form autocomplete context",
      status: weakPasswordAutocomplete.length ? "context" : "pass",
      risk: weakPasswordAutocomplete.length ? "medium" : "low",
      value: passwordForms.length ? `${passwordForms.length} password form(s)` : undefined,
      explanation: weakPasswordAutocomplete.length ? "Password fields were found without form-level autocomplete=off in static HTML." : "No password-form autocomplete concern was found in static HTML.",
      recommendation: weakPasswordAutocomplete.length ? "Review login and account flows for password-manager compatibility, MFA, CSRF protection, and credential handling." : "Continue validating authentication forms during manual security review.",
    }),
    finding({
      category: "Client-side risk",
      name: "Reverse-tabnabbing",
      status: blankTargetsWithoutNoopener.length ? "context" : "pass",
      risk: blankTargetsWithoutNoopener.length ? "medium" : "low",
      value: blankTargetsWithoutNoopener.length ? `${blankTargetsWithoutNoopener.length} target=_blank link(s)` : undefined,
      explanation: blankTargetsWithoutNoopener.length ? "Links opening new tabs without noopener/noreferrer were found." : "No target=_blank links missing noopener/noreferrer were found.",
      recommendation: blankTargetsWithoutNoopener.length ? "Add rel=\"noopener noreferrer\" to links that open in a new tab." : "Continue preventing opener access from new-tab links.",
    }),
  ];
}

export async function analyzePosture(input: {
  finalUrl: string;
  rootDomain: string;
  resources: ResourceFinding[];
  inlineScriptCount: number;
  inlineEventHandlerCount: number;
  inlineScriptRiskCount: number;
}): Promise<PostureFinding[]> {
  const final = new URL(input.finalUrl);
  const [tlsFindings, dnsFindings, securityTxtFindings, discoveryFindings] = await Promise.all([
    checkTls(final.hostname, final.protocol === "https:"),
    checkDns(input.rootDomain),
    checkSecurityTxt(final),
    checkDiscoveryFiles(final),
  ]);

  return [
    ...tlsFindings,
    ...dnsFindings,
    ...securityTxtFindings,
    ...discoveryFindings,
    ...checkPageHygiene(input.finalUrl, input.resources, input.inlineScriptCount, input.inlineEventHandlerCount, input.inlineScriptRiskCount),
  ];
}
