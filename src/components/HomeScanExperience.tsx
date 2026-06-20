"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, ArrowRight, CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import type { ScanReport } from "@/lib/scan/types";
import { ReportView } from "./ReportView";
import { UrlScanForm } from "./ScanExperience";

const coverage = [
  "HTTP response controls",
  "TLS certificate health",
  "DNS and email authentication",
  "Third-party supply chain",
  "Static client-side risk",
  "Vulnerability disclosure",
];

export function HomeScanExperience() {
  const [report, setReport] = useState<ScanReport | null>(null);

  if (report) {
    return (
      <section className="results-workspace">
        <div className="results-toolbar">
          <div className="results-toolbar-copy">
            <span className="console-eyebrow">Current assessment</span>
            <strong>{report.domain}</strong>
          </div>
          <div className="results-toolbar-form">
            <UrlScanForm compact onResult={setReport} />
          </div>
          <button className="button button-secondary" type="button" onClick={() => setReport(null)}>
            <RotateCcw size={16} />Reset
          </button>
        </div>
        <div id="scan-report" className="report-inline">
          <ReportView report={report} />
        </div>
      </section>
    );
  }

  return (
    <section className="scan-launchpad">
      <div className="launchpad-heading">
        <span className="product-label"><span />TraceLattice scanner</span>
        <h1>Inspect a public website&apos;s observable security posture.</h1>
        <p>Run a bounded, passive assessment across headers, cookies, third-party exposure, DNS, and TLS signals.</p>
      </div>
      <div className="scan-console scan-console-wide">
        <div className="console-header">
          <div>
            <span className="console-eyebrow">New assessment</span>
            <h2>Analyze a public origin</h2>
          </div>
          <span className="console-mode"><ShieldCheck size={14} />Passive</span>
        </div>
        <UrlScanForm onResult={setReport} />
        <div className="console-foot">
          <span>Public HTTP/S only</span>
          <span>3 HTML pages max</span>
          <span>No page body retention</span>
        </div>
        <div className="coverage-list coverage-strip" aria-label="Scanner coverage">
          {coverage.map((item) => <span key={item}><CheckCircle2 size={15} />{item}</span>)}
        </div>
      </div>
      <Link className="deep-scan-callout" href="/deep-scan">
        <span><Activity size={18} /><span><strong>Need runtime evidence?</strong><small>Run the local Playwright scanner to observe JavaScript-loaded requests, trackers, storage, and WebSockets.</small></span></span>
        <ArrowRight size={18} />
      </Link>
    </section>
  );
}
