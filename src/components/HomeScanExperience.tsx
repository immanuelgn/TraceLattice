"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, ScanLine, ShieldCheck } from "lucide-react";
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

interface ScanStatsResponse {
  count: number;
  available: boolean;
}

export function HomeScanExperience() {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [lifetimeScans, setLifetimeScans] = useState<number | null>(null);
  const [counterAvailable, setCounterAvailable] = useState(true);

  const refreshLifetimeScans = useCallback(async () => {
    try {
      const response = await fetch("/api/stats/scans", { cache: "no-store" });
      const data = await response.json() as ScanStatsResponse;
      if (!response.ok || !data.available) {
        setCounterAvailable(false);
        return;
      }
      setLifetimeScans(data.count);
      setCounterAvailable(true);
    } catch {
      setCounterAvailable(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refreshLifetimeScans(), 0);
    const refreshTimer = window.setInterval(() => void refreshLifetimeScans(), 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(refreshTimer);
    };
  }, [refreshLifetimeScans]);

  const handleResult = (nextReport: ScanReport) => {
    setReport(nextReport);
    if (typeof nextReport.lifetimeScanCount === "number") {
      setLifetimeScans(nextReport.lifetimeScanCount);
      setCounterAvailable(true);
    } else {
      void refreshLifetimeScans();
    }
  };

  if (report) {
    return (
      <section className="results-workspace">
        <div className="results-toolbar">
          <div className="results-toolbar-copy">
            <span className="console-eyebrow">Current assessment</span>
            <strong>{report.domain}</strong>
          </div>
          <div className="results-toolbar-form">
            <UrlScanForm compact onResult={handleResult} />
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
      <div className="launchpad-heading launchpad-heading-with-count">
        <div className="launchpad-copy">
          <span className="product-label"><span />TraceLattice scanner</span>
          <h1>Inspect a public website&apos;s observable security posture.</h1>
          <p>Start with Standard scan for a fast public check. Use Enhanced scan when you want a fuller look at trackers, ads, forms, or scripts that appear only after the page finishes loading.</p>
        </div>
        <div className={`lifetime-scan-counter ${counterAvailable ? "" : "is-unavailable"}`} aria-live="polite">
          <span className="lifetime-scan-icon"><ScanLine size={21} /></span>
          <div>
            <span>Lifetime scans</span>
            <strong>{lifetimeScans === null ? "--" : lifetimeScans.toLocaleString()}</strong>
            <small>{counterAvailable ? "Successful Standard + Enhanced scans" : "Live count temporarily unavailable"}</small>
          </div>
        </div>
      </div>
      <div className="scan-console scan-console-wide">
        <div className="console-header">
          <div>
            <span className="console-eyebrow">New assessment</span>
            <h2>Scan a public website</h2>
          </div>
          <span className="console-mode"><ShieldCheck size={14} />Standard scan by default</span>
        </div>
        <UrlScanForm onResult={handleResult} />
        <div className="console-foot">
          <span>Public HTTP/S only</span>
          <span>3 HTML pages max</span>
          <span>No page body retention</span>
          <span>Enhanced finds more loaded tools</span>
        </div>
        <div className="coverage-list coverage-strip" aria-label="Scanner coverage">
          {coverage.map((item) => <span key={item}><CheckCircle2 size={15} />{item}</span>)}
        </div>
      </div>
    </section>
  );
}
