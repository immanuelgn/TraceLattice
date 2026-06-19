import { Cookie, Gauge, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import { DisclaimerBanner } from "@/components/Primitives";
import { UrlScanForm } from "@/components/ScanExperience";

const checks = [
  [LockKeyhole, "Transport", "HTTPS and security headers"],
  [Cookie, "Cookies", "Flags, scope, and persistence"],
  [Network, "Exposure", "Third parties and trackers"],
  [Gauge, "Scoring", "Explainable, evidence-led risk"],
] as const;

export default function Home() {
  return (
    <div>
      <section className="hero hero-compact">
        <div className="grid-bg" />
        <div className="container hero-content">
          <div className="hero-kicker"><span />Defensive web posture scanner</div>
          <h1>Inspect a website&apos;s public <span>security posture.</span></h1>
          <p>Review observable headers, cookies, TLS, DNS, trackers, and third-party dependencies through a bounded defensive scan.</p>
          <UrlScanForm />
          <div className="hero-proof">
            <span><ShieldCheck size={16} />Up to three public pages</span>
            <span><ShieldCheck size={16} />No page content retained</span>
            <span><ShieldCheck size={16} />Evidence-led scoring</span>
          </div>
        </div>
      </section>

      <section className="home-summary container">
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
          <summary>How the scan stays safe and what it can miss</summary>
          <div>
            <p>TraceLattice validates DNS and every redirect, blocks private and reserved networks, caps response size and duration, and samples no more than three same-origin HTML pages.</p>
            <p>Because it does not execute target JavaScript, it can miss runtime trackers, API calls, and consent-gated resources. Scores describe observable posture—not proof of security or compliance.</p>
          </div>
        </details>
      </section>
    </div>
  );
}
