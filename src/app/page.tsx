import { Cookie, Gauge, LockKeyhole, Network } from "lucide-react";
import { HomeScanExperience } from "@/components/HomeScanExperience";
import { DisclaimerBanner } from "@/components/Primitives";

const checks = [
  [LockKeyhole, "Transport controls", "HTTPS, CSP, HSTS, framing, MIME and browser policy headers"],
  [Cookie, "Cookie hygiene", "Secure, HttpOnly, SameSite, scope and persistence context"],
  [Network, "Trust surface", "Third-party domains, trackers, scripts, forms and mixed content"],
  [Gauge, "Posture model", "Evidence-led components with transparent deductions and limitations"],
] as const;

export default function Home() {
  return (
    <div className="scan-page">
      <HomeScanExperience />

      <section className="home-dashboard container">
        <div className="dashboard-heading">
          <div>
            <span className="section-index">01</span>
            <h2>Assessment coverage</h2>
          </div>
          <p>Each category contributes evidence to a bounded posture report, not a universal safety verdict.</p>
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
