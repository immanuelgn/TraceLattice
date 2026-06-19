import type { Metadata } from "next";
import { Ban, EyeOff, Globe2, LockKeyhole, ShieldCheck, TimerReset } from "lucide-react";
import { DisclaimerBanner, SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = { title: "Security & ethics", description: "Defensive boundaries and SSRF protections used by TraceLattice." };

export default function EthicsPage() {
  const guardrails = [
    [Globe2, "Public web only", "Localhost, private networks, internal names, embedded credentials, and non-web protocols are rejected."],
    [LockKeyhole, "Redirect-aware SSRF defense", "DNS results and every redirect destination are validated before a request proceeds."],
    [TimerReset, "Bounded requests", "Three redirects, nine seconds, standard ports, and a 1.5 MB response ceiling."],
    [EyeOff, "Data minimization", "No HTML is retained. Cookie values are discarded. Browser history stores summaries only."],
    [Ban, "No offensive behavior", "No crawling, exploitation, brute force, bypass, payload injection, or vulnerability attacks."],
    [ShieldCheck, "Responsible output", "Findings are educational, evidence-based, and paired with limitations rather than compliance claims."],
  ] as const;
  return <div className="page-shell container"><SectionHeading eyebrow="Defensive boundaries" title="Useful intelligence without crossing the line." copy="TraceLattice is intentionally constrained to passive analysis of a single public homepage response." /><DisclaimerBanner /><div className="guardrail-grid">{guardrails.map(([Icon, title, copy]) => <article className="glass" key={title}><Icon /><h2>{title}</h2><p>{copy}</p></article>)}</div><section className="glass content-panel"><h2>Acceptable use</h2><p>Use TraceLattice on public websites for educational review, defensive engineering, vendor evaluation, and portfolio demonstration. Do not use it to harass operators, evade controls, target private systems, or represent heuristic output as a professional audit or legal conclusion.</p></section></div>;
}
