import { ArrowRight, Braces, Globe2, HardDrive, ServerCog, ShieldCheck } from "lucide-react";

export function ArchitectureDiagram() {
  const nodes = [
    [Globe2, "Browser", "URL input + report UI"],
    [ServerCog, "Route handler", "Validation + bounded fetch"],
    [ShieldCheck, "Analysis pipeline", "Headers, cookies, resources, DNS/TLS"],
    [Braces, "Scoring", "Weighted evidence ledger"],
    [HardDrive, "Local browser", "Optional summary history"],
  ] as const;
  return <div className="architecture">{nodes.map(([Icon, title, copy], index) => <div className="architecture-step" key={title}><div className="node"><Icon /><strong>{title}</strong><small>{copy}</small></div>{index < nodes.length - 1 && <ArrowRight />}</div>)}</div>;
}
