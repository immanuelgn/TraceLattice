import type { Metadata } from "next";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { Pill, SectionHeading } from "@/components/Primitives";
import { SCORE_WEIGHTS } from "@/lib/scan/scoring";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How TraceLattice collects signals and calculates its educational static posture score.",
};

const ledger = [
  ["Header posture", `${SCORE_WEIGHTS.headers * 100}% weight`],
  ["Cookie hygiene", `${SCORE_WEIGHTS.cookies * 100}% weight`],
  ["Third-party exposure", `${SCORE_WEIGHTS.exposure * 100}% weight`],
  ["Advanced posture", `${SCORE_WEIGHTS.advanced * 100}% weight`],
  ["Core headers", "CSP, HSTS, frame protection, nosniff, referrer, permissions"],
  ["Cookie context", "session/security cookies weighted above preference cookies"],
  ["Exposure context", "known trackers and third-party scripts weighted above functional CDNs"],
  ["Advanced context", "TLS, DNS email-auth, DNSSEC, CAA, security.txt, SRI, forms, client-side risk"],
];

export default function MethodologyPage() {
  return (
    <div className="page-shell container">
      <SectionHeading
        eyebrow="Transparent by design"
        title="How the signal becomes a static posture score."
        copy="The model is deterministic, inspectable, and intentionally bounded. It compares observed public-origin signals; it does not rank entire companies or replace a DAST audit."
      />
      <section className="glass content-panel">
        <h2>Analysis pipeline</h2>
        <ArchitectureDiagram />
      </section>
      <section className="content-grid">
        <article className="glass content-panel">
          <Pill tone="cyan">Collection</Pill>
          <h2>What is inspected</h2>
          <ul>
            <li>Final HTTPS state and redirect behavior</li>
            <li>Public HTTP response headers</li>
            <li>Set-Cookie names and attributes, never values</li>
            <li>Requested public page plus up to two same-origin HTML pages</li>
            <li>Static script, iframe, image, link, form, and meta-refresh references across inspected pages</li>
            <li>First-party versus third-party root domains</li>
            <li>Matches against a transparent local provider pattern list</li>
            <li>TLS certificate expiration and DNS posture signals</li>
            <li>SPF, DMARC, MX, CAA, DNSSEC, MTA-STS, and TLS-RPT record checks</li>
            <li>security.txt, robots.txt, sitemap.xml, mixed-content, form-action, SRI, reverse-tabnabbing, and inline-script risk checks</li>
          </ul>
        </article>
        <article className="glass content-panel">
          <Pill tone="violet">Boundaries</Pill>
          <h2>What is not inspected</h2>
          <ul>
            <li>No target JavaScript execution</li>
            <li>No broad crawl beyond the capped same-origin HTML sample</li>
            <li>No execution of referenced scripts, images, or iframes</li>
            <li>No login, form submission, or session state</li>
            <li>No exploitation or payload testing</li>
            <li>No legal or regulatory compliance determination</li>
          </ul>
        </article>
      </section>
      <section className="glass content-panel">
        <h2>Scoring ledger</h2>
        <p>
          TraceLattice calculates four component scores: security header posture, cookie hygiene, third-party exposure, and advanced posture. The final score is a weighted bounded snapshot,
          not a universal security verdict. Optional advanced headers such as COOP, CORP, and COEP are shown as evidence but are not treated like missing core controls for every site.
        </p>
        <div className="method-formula" aria-label="Score formula">
          <code>round(headers × 0.35 + cookies × 0.20 + exposure × 0.25 + advanced × 0.20)</code>
          <p>Every component starts at 100. Deterministic deductions are applied only for observed findings, with per-category caps preventing one repeated signal from dominating the result.</p>
        </div>
        <div className="penalty-grid">{ledger.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="grade-scale">{[["90-100", "Excellent"], ["80-89", "Good"], ["70-79", "Mixed signals"], ["60-69", "Context required"], ["0-59", "Weak"]].map(([range, label]) => <div key={range}><strong>{range}</strong><span>score band</span><small>{label}</small></div>)}</div>
      </section>
      <section className="limitations">
        <h2>Interpretation matters</h2>
        <p>
          Every score carries limited confidence because TraceLattice does not execute JavaScript, broadly crawl, authenticate, or observe runtime network traffic. A lower score does not
          prove a breach, malicious behavior, or non-compliance. A higher score does not prove safety or compliance. This is an educational static snapshot that helps prioritize manual investigation.
        </p>
      </section>
      <section className="glass content-panel">
        <Pill tone="green">Reproducibility</Pill>
        <h2>How to challenge a result</h2>
        <p>
          Export the JSON report, inspect each component reason and penalty, then compare the evidence with the target response. The score contains no hidden model call,
          random weighting, or proprietary external reputation feed. The same normalized inputs produce the same scoring decision.
        </p>
      </section>
    </div>
  );
}
