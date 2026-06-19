"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, PlayCircle, ScanSearch } from "lucide-react";
import { mockReports } from "@/lib/scan/mockReports";
import type { ScanReport } from "@/lib/scan/types";
import { ReportView } from "./ReportView";

export function UrlScanForm({ compact = false, onResult }: { compact?: boolean; onResult?: (report: ScanReport) => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);

  const run = async (value: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The website could not be scanned.");
      setReport(data);
      onResult?.(data);
      setTimeout(() => document.getElementById("scan-report")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The website could not be scanned.");
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (url.trim()) void run(url);
  };

  const demo = (level: keyof typeof mockReports) => {
    const next = { ...mockReports[level], scannedAt: new Date().toISOString() };
    setReport(next);
    onResult?.(next);
    setError("");
    setTimeout(() => document.getElementById("scan-report")?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  return (
    <>
      <div className={compact ? "" : "scanner-shell"}>
        <form className="scan-form" onSubmit={submit}>
          <label htmlFor={compact ? "compact-url" : "scan-url"}>Public website URL</label>
          <div className="input-row">
            <div className="url-input"><ScanSearch size={20} /><input id={compact ? "compact-url" : "scan-url"} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="example.com" autoComplete="url" /></div>
            <button className="button button-primary" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}{loading ? "Analyzing" : "Scan website"}</button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
        {!compact && <div className="demo-row"><span>Or explore fictional demo data:</span><button onClick={() => demo("low")}><PlayCircle size={14} />Low risk</button><button onClick={() => demo("medium")}><PlayCircle size={14} />Balanced</button><button onClick={() => demo("high")}><PlayCircle size={14} />Tracker-heavy</button></div>}
      </div>
      {report && !onResult && <div id="scan-report" className="container report-anchor"><ReportView report={report} /></div>}
    </>
  );
}
