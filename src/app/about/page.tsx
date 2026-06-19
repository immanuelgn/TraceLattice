import type { Metadata } from "next";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { Pill, SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = {
  title: "About TraceLattice",
  description: "Architecture and scope for the TraceLattice defensive web posture scanner.",
};

export default function AboutPage() {
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
          CAA, TLS certificate health, security.txt, mixed-content references, third-party form actions, cookies, headers, trackers, and third-party domains.
        </p>
      </section>
    </div>
  );
}
