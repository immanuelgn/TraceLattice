"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Braces, Check, ChevronDown, Clipboard, Cookie, Download, ExternalLink, Globe2, Info, LockKeyhole, Network, Radar, Save, ShieldCheck } from "lucide-react";
import type { ScanReport } from "@/lib/scan/types";
import { saveRecentScan } from "@/lib/scan/storage";
import { MetricCard, Pill, RiskBadge, ScoreRing } from "./Primitives";

function redactUrl(value: string) {
  return value.replace(/^https:/, "hxxps:").replace(/\./g, "[.]");
}

export function ReportView({ report }: { report: ScanReport }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const cookieIssues = report.cookies.filter((cookie) => cookie.issues.length).length;
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    report.thirdParties.forEach((item) => counts.set(item.category, (counts.get(item.category) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [report.thirdParties]);
  const scoreComponents = [
    { name: "Headers", component: report.score.components.headers },
    { name: "Cookies", component: report.score.components.cookies },
    { name: "Exposure", component: report.score.components.exposure },
  ];

  const copySummary = async () => {
    await navigator.clipboard.writeText(`${report.domain} scored ${report.score.value}/100 (${report.score.label}) as an observed static posture score, not a full security ranking. Header posture ${report.score.components.headers.value}/100, cookie hygiene ${report.score.components.cookies.value}/100, exposure ${report.score.components.exposure.value}/100. ${report.trackers.length} known tracker(s), ${cookieIssues} cookie issue(s), and ${report.thirdParties.length} third-party domain(s) were observed.`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${report.domain}-tracelattice-report.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  return (
    <div className="report-stack">
      <section className="glass report-hero">
        <div>
          <div className="report-kicker"><Pill tone="violet">Static posture report</Pill><span>{new Date(report.scannedAt).toLocaleString()}</span></div>
          <h1>{report.domain}</h1>
          <p className="mono">{report.finalUrl}</p>
          <p>{report.score.summary}</p>
          <div className="confidence-note"><Info size={14} /><span>{report.score.scopeNote}</span></div>
          <div className="action-row">
            <button className="button button-secondary" onClick={copySummary}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "Copied" : "Copy summary"}</button>
            <button className="button button-secondary" onClick={download}><Download size={16} />JSON</button>
            <button className="button button-secondary" onClick={() => { saveRecentScan(report); setSaved(true); }}><Save size={16} />{saved ? "Saved" : "Save"}</button>
          </div>
        </div>
        <div className="score-block">
          <ScoreRing score={report.score.value} />
          <Pill tone={report.score.value >= 80 ? "green" : report.score.value >= 60 ? "amber" : "red"}>{report.score.label}</Pill>
          <span className="confidence-label">Observed static posture</span>
        </div>
      </section>

      <section className="metric-grid compact-metrics component-metrics">
        <MetricCard label="Header posture" value={report.score.components.headers.value} detail={`${report.score.components.headers.label} static controls`} icon={<LockKeyhole />} />
        <MetricCard label="Cookie hygiene" value={report.score.components.cookies.value} detail={`${cookieIssues} contextual issue(s)`} icon={<Cookie />} />
        <MetricCard label="Exposure" value={report.score.components.exposure.value} detail={`${report.thirdParties.length} third-party domain(s)`} icon={<Network />} />
        <MetricCard label="Confidence" value="Limited" detail="No JS execution or crawl" icon={<Info />} />
      </section>

      <section className="glass component-panel">
        {scoreComponents.map(({ name, component }) => (
          <article key={name}>
            <div><span className="eyebrow">{name}</span><strong>{component.value}/100</strong><Pill tone={component.value >= 80 ? "green" : component.value >= 60 ? "amber" : "red"}>{component.label}</Pill></div>
            <p>{component.reasons[0]}</p>
          </article>
        ))}
      </section>

      <section className="report-grid executive-grid">
        <article className="glass panel">
          <div className="panel-title"><div><span className="eyebrow">What matters</span><h2>Priority findings</h2></div><AlertTriangle /></div>
          <div className="risk-list">
            {(report.score.topReasons.length ? report.score.topReasons : ["No material static penalties were observed. Runtime behavior remains untested."]).map((reason, index) => (
              <div key={reason}><span>0{index + 1}</span><p>{reason}</p></div>
            ))}
          </div>
        </article>
        <article className="glass panel">
          <div className="panel-title"><div><span className="eyebrow">What to do</span><h2>Recommended actions</h2></div><ShieldCheck /></div>
          <ul className="recommendation-list">
            {report.recommendations.slice(0, 4).map((item) => <li key={item}><Check size={16} />{item}</li>)}
          </ul>
        </article>
      </section>

      <details className="glass evidence-shell">
        <summary><span><Braces size={18} /><strong>Technical evidence</strong><small>Headers, cookies, score ledger, trackers, and resource inventory</small></span><ChevronDown size={18} /></summary>
        <div className="evidence-content">
          <section className="panel evidence-section">
            <div className="panel-title"><div><span className="eyebrow">Exposure lattice</span><h2>Browser → site → third parties</h2></div><Network /></div>
            <div className="exposure-map">
              <div className="node primary-node"><Globe2 />Visitor browser</div><span className="flow-line" />
              <div className="node target-node"><ShieldCheck />{report.rootDomain}</div><span className="flow-line multi" />
              <div className="category-cluster">
                {(categories.length ? categories : [["No third parties", 0]]).map(([name, count]) => <div className="category-node" key={name}><span>{count}</span>{name}</div>)}
              </div>
            </div>
          </section>

          <section className="report-grid evidence-section">
            <article className="panel">
              <div className="panel-title"><div><span className="eyebrow">Score ledger</span><h2>Observed penalties</h2></div><Braces /></div>
              <div className="score-bars">
                {report.score.penalties.length ? report.score.penalties.map((item) => <div key={item.label}><div><span>{item.label}</span><strong>−{item.points}</strong></div><div className="bar"><span style={{ width: `${Math.min(100, item.points * 4)}%` }} /></div></div>) : <p className="muted">No static penalties were generated.</p>}
              </div>
            </article>
            <article className="panel">
              <div className="panel-title"><div><span className="eyebrow">Positive signals</span><h2>Observed strengths</h2></div><ShieldCheck /></div>
              <ul className="recommendation-list positive-list">{report.score.positiveNotes.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
            </article>
          </section>

          <section className="panel table-panel evidence-section">
            <div className="panel-title"><div><span className="eyebrow">Header posture</span><h2>HTTP security headers</h2></div><ShieldCheck /></div>
            <div className="table-wrap"><table><thead><tr><th>Header</th><th>Status</th><th>Risk</th><th>Observed value / recommendation</th></tr></thead><tbody>{report.headers.map((header) => <tr key={header.name}><td className="mono">{header.name}</td><td>{header.present ? "Present" : "Missing"}</td><td><RiskBadge risk={header.risk} /></td><td>{header.value || header.recommendation}</td></tr>)}</tbody></table></div>
          </section>

          <section className="report-grid evidence-section">
            <article className="panel table-panel">
              <div className="panel-title"><div><span className="eyebrow">Cookie posture</span><h2>Cookie names & flags</h2></div><Cookie /></div>
              {report.cookies.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Flags</th><th>Issues</th></tr></thead><tbody>{report.cookies.map((cookie) => <tr key={cookie.name}><td className="mono">{cookie.name}</td><td>{cookie.category}</td><td>{[cookie.secure && "Secure", cookie.httpOnly && "HttpOnly", cookie.sameSite && `SameSite=${cookie.sameSite}`].filter(Boolean).join(", ") || "None observed"}</td><td>{cookie.issues.join("; ") || "No obvious issue"}</td></tr>)}</tbody></table></div> : <p className="muted">No Set-Cookie headers were observed.</p>}
            </article>
            <article className="panel">
              <div className="panel-title"><div><span className="eyebrow">Tracker signals</span><h2>Known categories</h2></div><Radar /></div>
              {report.trackers.length ? <div className="domain-list">{report.trackers.map((tracker) => <div key={tracker.domain}><div><strong>{tracker.category}</strong><span className="mono">{tracker.domain}</span></div><RiskBadge risk={tracker.risk} /></div>)}</div> : <p className="muted">No known tracker patterns were found in static references.</p>}
            </article>
          </section>

          <section className="panel evidence-section">
            <div className="panel-title"><div><span className="eyebrow">Resource inventory</span><h2>Third-party domains</h2></div><ExternalLink /></div>
            <div className="domain-grid">
              {report.thirdParties.length ? report.thirdParties.map((item) => <div className="domain-chip" key={item.domain}><span className="mono">{item.domain}</span><Pill tone={item.category === "Unknown" ? "amber" : item.category === "CDN / functional" ? "cyan" : "violet"}>{item.category}</Pill><small>{item.count} reference(s) · {item.resourceTypes.join(", ")}</small></div>) : <p className="muted">No third-party domains were observed.</p>}
            </div>
            {report.resources.some((item) => item.type === "meta-refresh") && <p className="redacted">Redacted refresh destination: {redactUrl(report.resources.find((item) => item.type === "meta-refresh")!.url)}</p>}
          </section>
        </div>
      </details>

      <details className="limitations compact-limitations">
        <summary>Scope and limitations</summary>
        <ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      </details>
    </div>
  );
}
