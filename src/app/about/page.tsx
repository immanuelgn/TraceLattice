import type { Metadata } from "next";
import Link from "next/link";
import { Braces, CheckCircle2, Gauge, LockKeyhole, ServerCog, Sparkles } from "lucide-react";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { Pill, SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = {
  title: "About TraceLattice",
  description: "Architecture and scope for the TraceLattice defensive web posture scanner.",
};

export default function AboutPage() {
  const decisions = [
    [LockKeyhole, "SSRF-aware fetching", "Public DNS and IP ranges are validated before requests and again at every redirect."],
    [Gauge, "Bounded execution", "Time, redirects, response bytes, pages, resources, and hosted-browser waits are capped."],
    [Braces, "Deterministic analysis", "Reports come from typed local rules and visible weights, with no opaque scoring model."],
    [ServerCog, "Free-tier friendly", "Standard scan needs no paid API. Enhanced scan is optional and only runs when Cloudflare credentials are configured."],
  ] as const;

  return (
    <div className="page-shell container">
      <SectionHeading
        eyebrow="Defensive scanner"
        title="Bounded web posture analysis without exploitation."
        copy="TraceLattice turns public web, DNS, TLS, cookie, and resource signals into an explainable security posture report."
      />

      <section className="glass about-hero">
        <div>
          <Pill tone="violet">Why it exists</Pill>
          <h2>Useful security signals are visible before invasive testing begins.</h2>
          <p>
            TraceLattice collects safe public signals, applies transparent scoring, and shows the evidence behind each result without running payloads,
            logging in, submitting forms, or making compliance claims.
          </p>
        </div>
        <div className="stat-stack">
          <span><strong>2</strong> scan depths</span>
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
          Standard scan is the fast default. It fetches the requested public page and up to two same-origin HTML pages, then checks headers, cookies, trackers,
          third-party domains, DNS email-auth records, DNSSEC delegation, MTA-STS, TLS-RPT, CAA, TLS certificate health, security.txt, public discovery files,
          mixed content, SRI coverage, reverse-tabnabbing, third-party form actions, and client-side hygiene signals.
        </p>
      </section>

      <section className="glass content-panel">
        <Pill tone="green">Enhanced scan</Pill>
        <h2>When Enhanced scan helps</h2>
        <p>
          Many modern sites start with a small HTML shell, then JavaScript fills in scripts, images, forms, and trackers after the page opens.
          Enhanced scan helps in that case: TraceLattice validates the same public URL, asks Cloudflare Browser Rendering to open it once, and parses the rendered HTML returned by Cloudflare with the same local rules.
          It does not use visitor cookies, log in, click, submit forms, bypass consent, or store page bodies.
        </p>
        <p className="muted">
          Technical note: Cloudflare Browser Rendering is the hosted browser service; rendered HTML means the page after JavaScript has had a chance to change it.
          Configure <code>CLOUDFLARE_ACCOUNT_ID</code> and <code>CLOUDFLARE_API_TOKEN</code> to enable it. Without those keys, Standard scan still works.
        </p>
      </section>

      <section className="content-panel portfolio-proof">
        <div className="portfolio-proof-heading">
          <div><Pill tone="green">Engineering evidence</Pill><h2>Built to be inspected, not merely demonstrated.</h2></div>
          <Sparkles size={28} />
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
          <span><CheckCircle2 size={15} />Public-origin validation before static fetches and optional hosted-browser renders</span>
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
