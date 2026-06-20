import type { Metadata } from "next";
import Link from "next/link";
import { Braces, CheckCircle2, Gauge, LockKeyhole, ServerCog, ShieldCheck } from "lucide-react";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { Pill, SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = {
  title: "About TraceLattice",
  description: "Architecture and scope for the TraceLattice defensive web posture scanner.",
};

export default function AboutPage() {
  const decisions = [
    [LockKeyhole, "SSRF-aware fetching", "Public DNS and IP ranges are validated before the first request and again at every redirect."],
    [Gauge, "Bounded execution", "Time, redirects, response bytes, pages, and resources are capped for predictable serverless behavior."],
    [Braces, "Deterministic analysis", "The report is generated from typed local rules and transparent weights, with no opaque model call."],
    [ServerCog, "Minimal infrastructure", "The production version needs no database, paid API, background queue, or retained page content."],
  ] as const;

  return (
    <div className="page-shell container">
      <SectionHeading
        eyebrow="Defensive scanner"
        title="Bounded web posture analysis without exploitation."
        copy="TraceLattice turns public web, DNS, TLS, cookie, and static resource signals into an explainable security posture report."
      />

      <section className="glass about-hero">
        <div>
          <Pill tone="violet">Why it exists</Pill>
          <h2>Useful security signals are often visible before runtime testing begins.</h2>
          <p>
            TraceLattice collects safe public signals from a target origin, applies transparent scoring, and shows the evidence behind each result without running payloads,
            logging in, or making compliance claims.
          </p>
        </div>
        <div className="stat-stack">
          <span><strong>$0</strong> required infrastructure</span>
          <span><strong>3</strong> HTML pages max</span>
          <span><strong>0</strong> retained page bodies</span>
        </div>
      </section>

      <section className="glass content-panel">
        <h2>Technical architecture</h2>
        <ArchitectureDiagram />
      </section>

      <section className="glass content-panel">
        <Pill tone="cyan">Scope</Pill>
        <h2>What the scanner does</h2>
        <p>
          Each scan fetches the requested public page and up to two same-origin HTML pages discovered from ordinary links. It also checks DNS email-auth records,
          DNSSEC delegation, MTA-STS, TLS-RPT, CAA, TLS certificate health, security.txt, public discovery files, mixed-content references, SRI coverage,
          reverse-tabnabbing signals, third-party form actions, cookies, headers, trackers, and third-party domains.
        </p>
      </section>

      <section className="content-panel portfolio-proof">
        <div className="portfolio-proof-heading">
          <div><Pill tone="green">Engineering evidence</Pill><h2>Built to be inspected, not merely demonstrated.</h2></div>
          <ShieldCheck size={28} />
        </div>
        <div className="decision-grid">
          {decisions.map(([Icon, title, copy]) => (
            <article key={title}>
              <Icon size={19} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="verification-list">
          <span><CheckCircle2 size={15} />Focused unit suites for URL validation, scoring, headers, cookies, trackers, and third parties</span>
          <span><CheckCircle2 size={15} />Responsive browser verification at desktop, tablet, and mobile widths</span>
          <span><CheckCircle2 size={15} />Production build, lint, API, loading, error, export, and report-state checks</span>
        </div>
        <div className="proof-links">
          <Link href="/methodology">Inspect the scoring model</Link>
          <Link href="/ethics">Review security guardrails</Link>
        </div>
      </section>
    </div>
  );
}
