"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Braces,
  Cookie,
  Download,
  ExternalLink,
  FileJson,
  Globe2,
  HardDrive,
  Import,
  Network,
  Play,
  Radar,
  RefreshCcw,
  ShieldCheck,
  TerminalSquare,
  Wifi,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { decodeDeepScanFragment, readDeepScanFile, validateDeepScanReport } from "@/lib/deepScan/codec";
import type { DeepScanReport, RuntimeFinding } from "@/lib/deepScan/types";
import { Pill, RiskBadge } from "./Primitives";

const SESSION_KEY = "tracelattice-deep-scan-v1";
const capabilities: Array<[LucideIcon, string, string]> = [
  [Network, "Runtime network", "XHR, fetch, scripts, frames, redirects, failures, and third-party domains"],
  [Cookie, "Browser state", "Cookie names and flags plus storage key names; values are never collected"],
  [Wifi, "Live channels", "WebSocket endpoints, console errors, and JavaScript-loaded providers"],
  [ShieldCheck, "Local safety", "Private-address blocking, service-worker blocking, request caps, and no server upload"],
];

function reportName(report: DeepScanReport) {
  return `tracelattice-deep-${report.rootDomain}.json`;
}

function riskTone(risk: RuntimeFinding["risk"]) {
  return risk === "high" ? "red" as const : risk === "medium" ? "amber" as const : "green" as const;
}

export function DeepScanExperience() {
  const [report, setReport] = useState<DeepScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const encoded = new URLSearchParams(window.location.hash.slice(1)).get("report");
        const stored = sessionStorage.getItem(SESSION_KEY);
        const next = encoded
          ? await decodeDeepScanFragment(encoded)
          : stored
            ? validateDeepScanReport(JSON.parse(stored))
            : null;
        if (!active || !next) return;
        setReport(next);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        if (encoded) history.replaceState(null, "", window.location.pathname);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "The deep-scan report could not be opened.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const next = await readDeepScanFile(file);
      setReport(next);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The report could not be imported.");
    } finally {
      event.target.value = "";
    }
  };

  const clear = () => {
    setReport(null);
    setError("");
    sessionStorage.removeItem(SESSION_KEY);
  };

  const download = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = reportName(report);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="deep-loading" role="status"><RefreshCcw className="spin" size={20} />Opening local runtime report</div>;
  }

  if (!report) {
    return (
      <div className="deep-empty">
        <section className="glass deep-command">
          <div className="deep-command-icon"><TerminalSquare size={25} /></div>
          <div>
            <span className="eyebrow">Local browser analysis</span>
            <h2>Run the deep scanner from this repository.</h2>
            <p>The command launches an isolated Playwright browser on your computer, observes runtime behavior, saves JSON, and opens the result here.</p>
            <code>npm run deep-scan -- https://example.com</code>
          </div>
        </section>
        <section className="deep-capabilities">
          {capabilities.map(([Icon, title, copy]) => (
            <article className="glass" key={title}>
              <Icon size={19} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>
        <div className="deep-import">
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={importFile} hidden />
          <button className="button button-primary" type="button" onClick={() => fileRef.current?.click()}><Import size={17} />Import deep-scan JSON</button>
          <span>Reports remain in this browser session and are not uploaded.</span>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="deep-report">
      <div className="deep-toolbar">
        <div><span className="eyebrow">Local runtime report</span><strong>{report.rootDomain}</strong></div>
        <div>
          <button className="button button-secondary" type="button" onClick={download}><Download size={16} />JSON</button>
          <button className="button button-secondary" type="button" onClick={clear}><XCircle size={16} />Close</button>
        </div>
      </div>

      <section className="glass deep-hero">
        <div>
          <div className="report-kicker"><Pill tone="cyan">Playwright runtime evidence</Pill><span>{new Date(report.startedAt).toLocaleString()}</span></div>
          <h1>{report.title || report.rootDomain}</h1>
          <p className="mono">{report.finalUrl}</p>
          <p>Observed in an isolated local Chromium session after target JavaScript executed.</p>
          <div className="report-meta">
            <span><Play size={14} /><strong>{report.durationMs.toLocaleString()} ms</strong> runtime</span>
            <span><Globe2 size={14} /><strong>HTTP {report.mainResponse.status}</strong> document</span>
            <span><Braces size={14} /><strong>Schema v{report.schemaVersion}</strong> report</span>
          </div>
        </div>
        <div className="deep-privacy">
          <ShieldCheck size={23} />
          <strong>Private handoff</strong>
          <p>The CLI compressed this report into the URL fragment. Fragments are not sent in HTTP requests, and TraceLattice removed it after import.</p>
        </div>
      </section>

      <section className="deep-metrics">
        {([
          [Network, "Requests", report.summary.requests],
          [Globe2, "Third parties", report.summary.thirdPartyDomains],
          [Radar, "Tracker domains", report.summary.trackerDomains],
          [Cookie, "Cookies", report.summary.cookies],
          [Wifi, "WebSockets", report.summary.webSockets],
          [XCircle, "Blocked", report.summary.blockedRequests],
        ] satisfies Array<[LucideIcon, string, number]>).map(([Icon, label, value]) => (
          <article className="glass" key={label}>
            <Icon size={18} /><span>{label}</span><strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="report-grid executive-grid">
        <article className="glass panel">
          <div className="panel-title"><div><span className="eyebrow">Runtime findings</span><h2>Observed priorities</h2></div><AlertTriangle /></div>
          {report.findings.length ? (
            <div className="deep-findings">
              {report.findings.map((finding) => (
                <div key={finding.id}>
                  <div><Pill tone={riskTone(finding.risk)}>{finding.risk}</Pill><span>{finding.confidence} confidence</span></div>
                  <h3>{finding.title}</h3>
                  <p>{finding.evidence}</p>
                  <small>{finding.recommendation}</small>
                </div>
              ))}
            </div>
          ) : <p className="muted">No material runtime findings were generated during this observation window.</p>}
        </article>
        <article className="glass panel">
          <div className="panel-title"><div><span className="eyebrow">Rendered page</span><h2>DOM and browser state</h2></div><HardDrive /></div>
          <div className="deep-state-grid">
            {Object.entries(report.page).map(([label, value]) => <div key={label}><span>{label.replace(/([A-Z])/g, " $1")}</span><strong>{value}</strong></div>)}
            <div><span>localStorage keys</span><strong>{report.storage.localStorageKeys.length}</strong></div>
            <div><span>sessionStorage keys</span><strong>{report.storage.sessionStorageKeys.length}</strong></div>
          </div>
        </article>
      </section>

      <section className="glass panel table-panel">
        <div className="panel-title"><div><span className="eyebrow">Runtime supply chain</span><h2>Third-party domains</h2></div><Network /></div>
        {report.thirdParties.length ? (
          <div className="table-wrap"><table><thead><tr><th>Domain</th><th>Requests</th><th>Resources</th><th>Classification</th></tr></thead><tbody>
            {report.thirdParties.map((party) => <tr key={party.domain}><td className="mono">{party.domain}</td><td>{party.requests}</td><td>{party.resourceTypes.join(", ")}</td><td>{party.trackerCategory ? <Pill tone={party.trackerCategory === "CDN / functional" ? "cyan" : "violet"}>{party.trackerCategory}</Pill> : "Unclassified"}</td></tr>)}
          </tbody></table></div>
        ) : <p className="muted">No third-party runtime domains were observed.</p>}
      </section>

      <section className="report-grid">
        <article className="glass panel table-panel">
          <div className="panel-title"><div><span className="eyebrow">Runtime cookies</span><h2>Names and attributes</h2></div><Cookie /></div>
          {report.cookies.length ? (
            <div className="table-wrap"><table><thead><tr><th>Name</th><th>Domain</th><th>Flags</th></tr></thead><tbody>
              {report.cookies.map((cookie, index) => <tr key={`${cookie.name}-${cookie.domain}-${index}`}><td className="mono">{cookie.name}</td><td className="mono">{cookie.domain}</td><td>{[cookie.secure && "Secure", cookie.httpOnly && "HttpOnly", `SameSite=${cookie.sameSite}`].filter(Boolean).join(", ")}</td></tr>)}
            </tbody></table></div>
          ) : <p className="muted">No cookies were present after the observation window.</p>}
        </article>
        <article className="glass panel">
          <div className="panel-title"><div><span className="eyebrow">Live channels</span><h2>WebSockets and browser errors</h2></div><Wifi /></div>
          <div className="deep-list">
            {report.webSockets.map((url) => <div key={url}><ExternalLink size={14} /><span className="mono">{url}</span></div>)}
            {report.console.map((entry, index) => <div key={`${entry.type}-${index}`}><RiskBadge risk={entry.type === "error" ? "high" : "medium"} /><span>{entry.text}</span></div>)}
            {!report.webSockets.length && !report.console.length && <p className="muted">No WebSockets, console warnings, or console errors were recorded.</p>}
          </div>
        </article>
      </section>

      <details className="glass evidence-shell">
        <summary><span><FileJson size={18} /><strong>Request evidence</strong><small>Sanitized URLs, methods, resource types, status codes, and classifications</small></span><ExternalLink size={18} /></summary>
        <div className="evidence-content">
          <div className="table-wrap"><table><thead><tr><th>Method</th><th>Type</th><th>Status</th><th>Domain</th><th>URL</th></tr></thead><tbody>
            {report.requests.map((request, index) => <tr key={`${request.url}-${index}`}><td>{request.method}</td><td>{request.resourceType}</td><td>{request.status || "-"}</td><td>{request.thirdParty ? <Pill tone="amber">third party</Pill> : "first party"}<br /><span className="mono">{request.domain}</span></td><td className="mono">{request.url}</td></tr>)}
          </tbody></table></div>
        </div>
      </details>

      <details className="limitations compact-limitations">
        <summary>Scope and limitations</summary>
        <ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      </details>
    </div>
  );
}
