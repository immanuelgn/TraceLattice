import { CheckCircle2, Cookie, Gauge, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import { DisclaimerBanner } from "@/components/Primitives";
import { UrlScanForm } from "@/components/ScanExperience";

const checks = [
  [LockKeyhole, "Transport controls", "HTTPS, CSP, HSTS, framing, MIME and browser policy headers"],
  [Cookie, "Cookie hygiene", "Secure, HttpOnly, SameSite, scope and persistence context"],
  [Network, "Trust surface", "Third-party domains, trackers, scripts, forms and mixed content"],
  [Gauge, "Posture model", "Evidence-led components with transparent deductions and limitations"],
] as const;

const coverage = [
  "HTTP response controls",
  "TLS certificate health",
  "DNS and email authentication",
  "Third-party supply chain",
  "Static client-side risk",
  "Vulnerability disclosure",
];

export default function Home() {
  return (
    <div className="scan-page">
      <section className="scan-workspace container">
        <div className="scan-intro">
          <div className="product-label"><span />TraceLattice scanner</div>
          <h1>Map a website&apos;s public security posture.</h1>
          <p>Run a bounded defensive assessment across observable web, DNS, TLS, cookie, and third-party signals.</p>
          <div className="coverage-list" aria-label="Scanner coverage">
            {coverage.map((item) => <span key={item}><CheckCircle2 size={15} />{item}</span>)}
          </div>
        </div>

        <div className="scan-console">
          <div className="console-header">
            <div>
              <span className="console-eyebrow">New assessment</span>
              <h2>Scan a public origin</h2>
            </div>
            <span className="console-mode"><ShieldCheck size={14} />Passive</span>
          </div>
          <UrlScanForm />
          <div className="console-foot">
            <span>Public HTTP/S only</span>
            <span>3 HTML pages max</span>
            <span>No page body retention</span>
          </div>
        </div>
      </section>

      <section className="home-dashboard container">
        <div className="dashboard-heading">
          <div>
            <span className="section-index">01</span>
            <h2>Assessment coverage</h2>
          </div>
          <p>Each category contributes evidence to a bounded posture report—not a universal safety verdict.</p>
        </div>
        <div className="check-strip">
          {checks.map(([Icon, title, copy]) => (
            <article key={title}>
              <Icon size={19} />
              <div><strong>{title}</strong><span>{copy}</span></div>
            </article>
          ))}
        </div>
        <DisclaimerBanner />
        <details className="scope-disclosure">
          <summary>Scope, safeguards, and blind spots</summary>
          <div>
            <p>Every target and redirect is DNS-validated. Private, reserved, local, credentialed, and non-standard-port destinations are blocked before fetching.</p>
            <p>TraceLattice does not execute target JavaScript, authenticate, submit forms, test payloads, or observe consent-gated runtime activity.</p>
          </div>
        </details>
      </section>
    </div>
  );
}
