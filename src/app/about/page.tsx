import type { Metadata } from "next";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { Pill, SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = { title: "About the project", description: "Architecture, skills, resume bullets, and portfolio notes for TraceLattice." };

export default function AboutPage() {
  return (
    <div className="page-shell container">
      <SectionHeading eyebrow="Portfolio case study" title="Privacy engineering, shipped as a real product." copy="TraceLattice demonstrates secure backend design, explainable risk scoring, thoughtful UX, and cost-aware serverless architecture." />
      <section className="glass about-hero"><div><Pill tone="violet">Why it exists</Pill><h2>Privacy risk is often visible before a single line of target JavaScript runs.</h2><p>I built TraceLattice to turn those public clues—headers, cookies, script references, and third-party domains—into a structured report that security teams and non-specialists can both understand.</p></div><div className="stat-stack"><span><strong>$0</strong> required infrastructure</span><span><strong>1</strong> bounded homepage fetch</span><span><strong>0</strong> retained page bodies</span></div></section>
      <section className="glass content-panel"><h2>Technical architecture</h2><ArchitectureDiagram /></section>
      <section className="content-grid">
        <article className="glass content-panel"><h2>Skills demonstrated</h2><div className="tag-cloud">{["Next.js App Router", "TypeScript", "React", "Tailwind CSS", "Route Handlers", "SSRF prevention", "DNS validation", "HTTP headers", "Cookie security", "Privacy engineering", "Risk scoring", "Vercel", "Vitest", "Accessible UI"].map((tag) => <span key={tag}>{tag}</span>)}</div></article>
        <article className="glass content-panel"><h2>What I learned</h2><ul><li>SSRF prevention is a pipeline, not a single regex.</li><li>Privacy signals need context to avoid alarmist conclusions.</li><li>Transparent scoring builds more trust than opaque “AI risk” claims.</li><li>Narrow product scope can improve security, cost, and usability at once.</li></ul></article>
      </section>
      <section className="glass content-panel resume-panel"><Pill tone="cyan">Resume-ready</Pill><h2>Selected accomplishment bullets</h2><ul><li>Built TraceLattice, a defensive privacy analysis platform using Next.js, TypeScript, and Vercel serverless functions.</li><li>Implemented redirect-aware SSRF protection, DNS/IP validation, HTTP security header analysis, cookie risk detection, tracker categorization, and deterministic risk scoring.</li><li>Designed a polished dashboard with report exports, website comparison, local-only scan history, transparent methodology, and zero required paid services.</li></ul></section>
    </div>
  );
}
