import { Cookie, Gauge, LockKeyhole, Network, ShieldCheck, Sparkles } from "lucide-react";
import { DisclaimerBanner, Pill } from "@/components/Primitives";
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
        <div className="grid-bg" /><div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        <div className="container hero-content">
          <Pill tone="cyan"><Sparkles size={14} />Defensive web intelligence</Pill>
          <h1>Know what a website<br /><span>exposes.</span></h1>
          <p>A focused static review of security headers, cookies, trackers, and third-party trust—without crawling or executing target JavaScript.</p>
          <UrlScanForm />
          <div className="hero-proof">
            <span><ShieldCheck size={16} />Public homepage only</span>
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
            <p>TraceLattice validates DNS and every redirect, blocks private and reserved networks, limits requests to nine seconds and 1.5 MB, and fetches only one public homepage.</p>
            <p>Because it does not execute JavaScript, it can miss trackers, API calls, and resources loaded dynamically after the page opens. Scores describe observable static posture—not proof of security or compliance.</p>
          </div>
        </details>
      </section>
    </div>
  );
}
