import type { Metadata } from "next";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { Pill, SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How TraceLattice collects signals and calculates its educational static posture score.",
};

const ledger = [
  ["Header posture", "45% weight"],
  ["Cookie hygiene", "25% weight"],
  ["Third-party exposure", "30% weight"],
  ["Core headers", "CSP, HSTS, frame protection, nosniff, referrer, permissions"],
  ["Cookie context", "session/security cookies weighted above preference cookies"],
  ["Exposure context", "known trackers and third-party scripts weighted above functional CDNs"],
];

export default function MethodologyPage() {
  return (
    <div className="page-shell container">
      <SectionHeading
        eyebrow="Transparent by design"
        title="How the signal becomes a static posture score."
        copy="The model is deterministic, inspectable, and intentionally bounded. It compares observed homepage signals; it does not rank entire companies or replace a DAST audit."
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
            <li>Static script, iframe, image, link, form, and meta-refresh references</li>
            <li>First-party versus third-party root domains</li>
            <li>Matches against a transparent local provider pattern list</li>
          </ul>
        </article>
        <article className="glass content-panel">
          <Pill tone="violet">Boundaries</Pill>
          <h2>What is not inspected</h2>
          <ul>
            <li>No target JavaScript execution</li>
            <li>No crawling beyond the homepage</li>
            <li>No fetched scripts, images, or iframes</li>
            <li>No login, form submission, or session state</li>
            <li>No exploitation or payload testing</li>
            <li>No legal or regulatory compliance determination</li>
          </ul>
        </article>
      </section>
      <section className="glass content-panel">
        <h2>Scoring ledger</h2>
        <p>
          TraceLattice calculates three component scores: security header posture, cookie hygiene, and third-party exposure. The final score is a weighted static snapshot,
          not a universal security verdict. Optional advanced headers such as COOP, CORP, and COEP are shown as evidence but are not treated like missing core controls for every site.
        </p>
        <div className="penalty-grid">{ledger.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="grade-scale">{[["90-100", "Excellent"], ["80-89", "Good"], ["70-79", "Moderate"], ["60-69", "Needs Review"], ["0-59", "Weak"]].map(([range, label]) => <div key={range}><strong>{range}</strong><span>score band</span><small>{label}</small></div>)}</div>
      </section>
      <section className="limitations">
        <h2>Interpretation matters</h2>
        <p>
          Every score carries limited confidence because TraceLattice does not execute JavaScript, crawl, authenticate, or observe runtime network traffic. A lower score does not
          prove a breach, malicious behavior, or non-compliance. A higher score does not prove safety or compliance. This is an educational static snapshot that helps prioritize manual investigation.
        </p>
      </section>
    </div>
  );
}
