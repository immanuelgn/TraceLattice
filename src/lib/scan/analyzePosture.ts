import { resolveCaa, resolveMx, resolveTxt } from "node:dns/promises";
import * as tls from "node:tls";
import type { PostureFinding, ResourceFinding, Risk } from "./types";
import { validatePublicUrl } from "./validateUrl";

const SECURITY_TXT_LIMIT = 200_000;

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
  const [txtResult, dmarcResult, mxResult, caaResult] = await Promise.allSettled([
    resolveTxt(rootDomain),
    resolveTxt(`_dmarc.${rootDomain}`),
    resolveMx(rootDomain),
    resolveCaa(rootDomain),
  ]);

  const txt = txtResult.status === "fulfilled" ? txtResult.value : [];
  const dmarc = dmarcResult.status === "fulfilled" ? dmarcResult.value : [];
  const mx = mxResult.status === "fulfilled" ? mxResult.value : [];
  const caa = caaResult.status === "fulfilled" ? caaResult.value : [];
  const spf = textRecordIncludes(txt, "v=spf1");
  const dmarcRecord = textRecordIncludes(dmarc, "v=dmarc1");
  const dmarcLower = dmarcRecord?.toLowerCase() || "";
  const dmarcPolicy = dmarcLower.match(/(?:^|;)\s*p\s*=\s*([^;]+)/)?.[1]?.trim();

  return [
    finding({
      category: "DNS email",
      name: "SPF record",
      status: spf ? "pass" : "context",
      risk: spf ? "low" : "medium",
      value: spf ? dnsValue(spf) : undefined,
      explanation: spf ? "An SPF TXT record was found for the root domain." : "No SPF TXT record was found for the root domain.",
      recommendation: spf ? "Review SPF includes periodically to avoid overbroad sender authorization." : "If this domain sends email, publish an SPF record that only authorizes expected senders.",
    }),
    finding({
      category: "DNS email",
      name: "DMARC policy",
      status: dmarcRecord ? dmarcPolicy === "reject" || dmarcPolicy === "quarantine" ? "pass" : "context" : "missing",
      risk: dmarcRecord ? dmarcPolicy === "reject" || dmarcPolicy === "quarantine" ? "low" : "medium" : "medium",
      value: dmarcRecord ? dnsValue(dmarcRecord) : undefined,
      explanation: dmarcRecord ? `A DMARC policy was found with p=${dmarcPolicy || "unknown"}.` : "No DMARC policy was found at _dmarc for the root domain.",
      recommendation: dmarcRecord ? "Move toward quarantine or reject after validating legitimate mail flows." : "If this domain sends email, publish DMARC to reduce spoofing risk and collect reports.",
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

function checkPageHygiene(finalUrl: string, resources: ResourceFinding[], inlineScriptCount: number): PostureFinding[] {
  const final = new URL(finalUrl);
  const mixed = final.protocol === "https:" ? resources.filter((resource) => resource.url.startsWith("http:")) : [];
  const activeMixed = mixed.filter((resource) => ["script", "iframe", "form"].includes(resource.type));
  const crossDomainForms = resources.filter((resource) => resource.type === "form" && resource.thirdParty);
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
  ];
}

export async function analyzePosture(input: {
  finalUrl: string;
  rootDomain: string;
  resources: ResourceFinding[];
  inlineScriptCount: number;
}): Promise<PostureFinding[]> {
  const final = new URL(input.finalUrl);
  const [tlsFindings, dnsFindings, securityTxtFindings] = await Promise.all([
    checkTls(final.hostname, final.protocol === "https:"),
    checkDns(input.rootDomain),
    checkSecurityTxt(final),
  ]);

  return [
    ...tlsFindings,
    ...dnsFindings,
    ...securityTxtFindings,
    ...checkPageHygiene(input.finalUrl, input.resources, input.inlineScriptCount),
  ];
}
