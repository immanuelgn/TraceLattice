"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Braces, Check, ChevronDown, Clipboard, Cookie, Download, ExternalLink, FileCheck2, FlaskConical, Globe2, Info, LockKeyhole, Network, Radar, Save, ShieldCheck, Sigma, Telescope, Timer } from "lucide-react";
import { SCORE_WEIGHTS } from "@/lib/scan/scoring";
import type { ScanReport } from "@/lib/scan/types";
import { saveRecentScan } from "@/lib/scan/storage";
import { Pill, RiskBadge, ScoreRing } from "./Primitives";

function redactUrl(value: string) {
  return value.replace(/^https:/, "hxxps:").replace(/\./g, "[.]");
}

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
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
    { key: "headers" as const, name: "Headers", component: report.score.components.headers },
    { key: "cookies" as const, name: "Cookies", component: report.score.components.cookies },
    { key: "exposure" as const, name: "Exposure", component: report.score.components.exposure },
    { key: "advanced" as const, name: "Advanced", component: report.score.components.advanced },
  ];
  const scoreCalculation = scoreComponents.map(({ key, name, component }) => ({
    key,
    name,
    value: component.value,
    weight: SCORE_WEIGHTS[key],
    contribution: component.value * SCORE_WEIGHTS[key],
  }));

  const copySummary = async () => {
    try {
      await copyText(`${report.domain} scored ${report.score.value}/100 (${report.score.label}) as an observed static posture score, not a full security ranking. Header posture ${report.score.components.headers.value}/100, cookie hygiene ${report.score.components.cookies.value}/100, exposure ${report.score.components.exposure.value}/100, advanced posture ${report.score.components.advanced.value}/100. ${report.trackers.length} known tracker(s), ${cookieIssues} cookie issue(s), and ${report.thirdParties.length} third-party domain(s) were observed.`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
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
      <div className={`report-provenance ${report.source.kind === "demo" ? "is-demo" : "is-live"}`}>
        {report.source.kind === "demo" ? <FlaskConical size={17} /> : <FileCheck2 size={17} />}
        <div><strong>{report.source.label}</strong><span>{report.source.description}</span></div>
      </div>
      <section className="glass report-hero">
        <div>
          <div className="report-kicker"><Pill tone="violet">Static posture report</Pill><span>{new Date(report.scannedAt).toLocaleString()}</span></div>
          <h1>{report.domain}</h1>
          <p className="mono">{report.finalUrl}</p>
          <p>{report.score.summary}</p>
          <div className="confidence-note"><Info size={14} /><span>{report.score.scopeNote}</span></div>
          <div className="report-meta" aria-label="Scan metadata">
            <span><Timer size={14} /><strong>{report.durationMs.toLocaleString()} ms</strong> duration</span>
            <span><Globe2 size={14} /><strong>{report.inspectedUrls.length}</strong> page{report.inspectedUrls.length === 1 ? "" : "s"} inspected</span>
            <span><FileCheck2 size={14} /><strong>HTTP {report.statusCode}</strong> final response</span>
          </div>
          <div className="action-row">
            <button className="button button-secondary" type="button" onClick={copySummary}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "Copied" : "Copy summary"}</button>
            <button className="button button-secondary" type="button" onClick={download}><Download size={16} />JSON</button>
            <button className="button button-secondary" type="button" onClick={() => { saveRecentScan(report); setSaved(true); }}><Save size={16} />{saved ? "Saved" : "Save locally"}</button>
          </div>
        </div>
        <div className="score-block">
          <ScoreRing score={report.score.value} />
          <Pill tone={report.score.value >= 80 ? "green" : report.score.value >= 60 ? "amber" : "red"}>{report.score.label}</Pill>
          <span className="confidence-label">Observed static posture</span>
        </div>
      </section>

      <section className="signal-overview">
        {scoreComponents.map(({ name, component }, index) => {
          const Icon = [LockKeyhole, Cookie, Network, Telescope][index];
          const tone = component.value >= 80 ? "green" : component.value >= 60 ? "amber" : "red";
          return (
          <article className="signal-card" key={name}>
            <div className="signal-card-head">
              <span className="signal-icon"><Icon size={18} /></span>
              <Pill tone={tone}>{component.label}</Pill>
            </div>
            <div className="signal-value"><strong>{component.value}</strong><span>/100</span></div>
            <div className="signal-label">{name}</div>
            <div className="signal-track"><span style={{ width: `${component.value}%` }} /></div>
            <p>{component.reasons[0]}</p>
          </article>
          );
        })}
      </section>

      <section className="glass score-explainer" aria-labelledby="score-explainer-title">
        <div className="score-explainer-heading">
          <div><span className="eyebrow">Transparent calculation</span><h2 id="score-explainer-title">How the {report.score.value} score is calculated</h2></div>
          <Sigma size={22} />
        </div>
        <div className="score-formula">
          {scoreCalculation.map((item, index) => (
            <div className="formula-term" key={item.key}>
              <span>{item.name}</span>
              <strong>{item.value} × {Math.round(item.weight * 100)}%</strong>
              <small>{item.contribution.toFixed(1)} points</small>
              {index < scoreCalculation.length - 1 && <b aria-hidden="true">+</b>}
            </div>
          ))}
          <div className="formula-total">
            <span>Rounded total</span>
            <strong>{scoreCalculation.reduce((total, item) => total + item.contribution, 0).toFixed(1)} → {report.score.value}</strong>
          </div>
        </div>
        <p>Each component begins at 100 and loses points only for observed, documented signals. Optional context checks are not treated like universal requirements.</p>
        <Link href="/methodology">Review the complete scoring methodology <ExternalLink size={14} /></Link>
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
        <summary><span><Braces size={18} /><strong>Technical evidence</strong><small>Headers, cookies, advanced posture, trackers, and resources</small></span><ChevronDown size={18} /></summary>
        <div className="evidence-content">
          <section className="panel evidence-section">
            <div className="panel-title"><div><span className="eyebrow">Exposure lattice</span><h2>Browser to site to third parties</h2></div><Network /></div>
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
                {report.score.penalties.length ? report.score.penalties.map((item) => <div key={item.label}><div><span>{item.label}</span><strong>-{item.points}</strong></div><div className="bar"><span style={{ width: `${Math.min(100, item.points * 4)}%` }} /></div></div>) : <p className="muted">No static penalties were generated.</p>}
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

          <section className="panel table-panel evidence-section">
            <div className="panel-title"><div><span className="eyebrow">Advanced posture</span><h2>DNS, TLS, disclosure, and page hygiene</h2></div><Telescope /></div>
            <div className="table-wrap"><table><thead><tr><th>Check</th><th>Status</th><th>Risk</th><th>Evidence / recommendation</th></tr></thead><tbody>{report.posture.map((item) => <tr key={`${item.category}-${item.name}`}><td><span className="mono">{item.category}</span><br />{item.name}</td><td>{item.status}</td><td><RiskBadge risk={item.risk} /></td><td>{item.value ? `${item.value}. ` : ""}{item.explanation} {item.recommendation}</td></tr>)}</tbody></table></div>
          </section>

          <section className="panel evidence-section">
            <div className="panel-title"><div><span className="eyebrow">Coverage</span><h2>Inspected HTML pages</h2></div><Globe2 /></div>
            <div className="domain-list">{report.inspectedUrls.map((url, index) => <div key={`${url}-${index}`}><div><strong>Fetched</strong><span className="mono">{url}</span></div><RiskBadge risk="low" /></div>)}</div>
          </section>

          <section className="report-grid evidence-section">
            <article className="panel table-panel">
              <div className="panel-title"><div><span className="eyebrow">Cookie posture</span><h2>Cookie names & flags</h2></div><Cookie /></div>
              {report.cookies.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Flags</th><th>Issues</th></tr></thead><tbody>{report.cookies.map((cookie, index) => <tr key={`${cookie.name}-${index}`}><td className="mono">{cookie.name}</td><td>{cookie.category}</td><td>{[cookie.secure && "Secure", cookie.httpOnly && "HttpOnly", cookie.sameSite && `SameSite=${cookie.sameSite}`].filter(Boolean).join(", ") || "None observed"}</td><td>{cookie.issues.join("; ") || "No obvious issue"}</td></tr>)}</tbody></table></div> : <p className="muted">No Set-Cookie headers were observed.</p>}
            </article>
            <article className="panel">
              <div className="panel-title"><div><span className="eyebrow">Tracker signals</span><h2>Known categories</h2></div><Radar /></div>
              {report.trackers.length ? <div className="domain-list">{report.trackers.map((tracker, index) => <div key={`${tracker.domain}-${index}`}><div><strong>{tracker.category}</strong><span className="mono">{tracker.domain}</span></div><RiskBadge risk={tracker.risk} /></div>)}</div> : <p className="muted">No known tracker patterns were found in static references.</p>}
            </article>
          </section>

          <section className="panel evidence-section">
            <div className="panel-title"><div><span className="eyebrow">Resource inventory</span><h2>Third-party domains</h2></div><ExternalLink /></div>
            <div className="domain-grid">
              {report.thirdParties.length ? report.thirdParties.map((item) => <div className="domain-chip" key={item.domain}><span className="mono">{item.domain}</span><Pill tone={item.category === "Unknown" ? "amber" : item.category === "CDN / functional" ? "cyan" : "violet"}>{item.category}</Pill><small>{item.count} reference(s) - {item.resourceTypes.join(", ")}</small></div>) : <p className="muted">No third-party domains were observed.</p>}
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
