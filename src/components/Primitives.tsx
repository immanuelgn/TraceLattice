import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { Risk } from "@/lib/scan/types";

export function SectionHeading({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy?: string }) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

export function Pill({ children, tone = "cyan" }: { children: ReactNode; tone?: "cyan" | "green" | "amber" | "red" | "violet" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function RiskBadge({ risk }: { risk: Risk }) {
  const icon = risk === "low" ? <CheckCircle2 size={13} /> : risk === "high" ? <AlertTriangle size={13} /> : <Info size={13} />;
  return <span className={`risk risk-${risk}`}>{icon}{risk}</span>;
}

export function ScoreRing({ score, size = "large", caption = "static score" }: { score: number; size?: "large" | "small"; caption?: string }) {
  const color = score >= 80 ? "#3ee6b0" : score >= 60 ? "#ffbd59" : "#ff6577";
  return (
    <div className={`score-ring score-${size}`} style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,.07) 0deg)` }}>
      <div><strong>{score}</strong><span>{caption}</span></div>
    </div>
  );
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: ReactNode; detail: string; icon?: ReactNode }) {
  return (
    <article className="glass metric-card">
      <div className="metric-top"><span>{label}</span>{icon}</div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export function DisclaimerBanner() {
  return (
    <div className="disclaimer">
      <Info size={18} />
      <p><strong>Bounded defensive analysis.</strong> TraceLattice samples up to three public same-origin pages plus visible DNS, TLS, header, cookie, and resource signals. It does not execute target JavaScript, authenticate, exploit, or determine legal compliance.</p>
    </div>
  );
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="glass empty-state"><Info size={30} /><h3>{title}</h3><p>{copy}</p></div>;
}
