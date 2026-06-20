"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Check, LoaderCircle, PlayCircle, RotateCcw, ScanSearch, Sparkles, X } from "lucide-react";
import { mockReports } from "@/lib/scan/mockReports";
import type { ScanReport } from "@/lib/scan/types";
import { ReportView } from "./ReportView";

const standardScanStages = [
  "Checking the website address",
  "Reading the public page",
  "Checking headers, cookies, DNS, and TLS",
  "Building the evidence-led report",
];

const enhancedScanStages = [
  "Checking the website address",
  "Reading the public response",
  "Loading the page in a safe cloud browser",
  "Checking what appears after the page finishes loading",
  "Building the evidence-led report",
];

const demoProfiles = [
  { key: "low" as const, label: "Modern SaaS", detail: "Strong baseline" },
  { key: "medium" as const, label: "Publisher", detail: "Mixed signals" },
  { key: "high" as const, label: "Legacy portal", detail: "High exposure" },
];

function explainScanError(message: string) {
  if (/Enhanced scan is not configured/i.test(message)) return "Use Standard scan for now. Enhanced scan needs the site owner to finish the cloud-browser setup.";
  if (/limit reached/i.test(message)) return "This scanner limits repeated requests to protect the public service. Wait a few minutes, then retry.";
  if (/respond|reached|unavailable|automated requests|provider HTTP|render JavaScript/i.test(message)) return "The website or cloud browser may be slow, offline, or blocking automated requests. Try Standard scan or retry later.";
  if (/private|reserved|localhost|port|protocol|credentials|public suffix/i.test(message)) return "For safety, TraceLattice only scans ordinary public websites.";
  if (/HTML document|response is too large|1\.5 MB/i.test(message)) return "The target did not return a small public HTML page that fits this bounded scanner.";
  return "Review the address and try again. The scanner never bypasses access controls or retries aggressively.";
}

export function UrlScanForm({ compact = false, onResult }: { compact?: boolean; onResult?: (report: ScanReport) => void }) {
  const inputId = useId();
  const statusId = `${inputId}-status`;
  const enhancedId = `${inputId}-enhanced`;
  const [url, setUrl] = useState("");
  const [enhanced, setEnhanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [stage, setStage] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = () => {
    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    stageTimerRef.current = null;
  };

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
  }, []);

  const run = async (value: string) => {
    const useEnhanced = enhanced && !compact;
    const stages = useEnhanced ? enhancedScanStages : standardScanStages;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError("");
    setStage(0);
    stopTimers();
    stageTimerRef.current = setInterval(() => {
      setStage((current) => Math.min(stages.length - 1, current + 1));
    }, 2200);
    const timeout = setTimeout(() => controller.abort("client-timeout"), useEnhanced ? 45_000 : 30_000);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value, mode: useEnhanced ? "enhanced" : "standard" }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null) as ScanReport | { error?: string } | null;
      if (!response.ok || !data || "error" in data) {
        throw new Error(data && "error" in data && data.error ? data.error : "The website could not be scanned.");
      }
      setStage(stages.length - 1);
      setReport(data as ScanReport);
      onResult?.(data as ScanReport);
      setTimeout(() => document.getElementById("scan-report")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (err) {
      if (controller.signal.aborted && controller.signal.reason !== "client-timeout") return;
      setError(
        controller.signal.reason === "client-timeout"
          ? `The scan exceeded the ${useEnhanced ? "45" : "30"}-second browser wait limit.`
          : err instanceof Error
            ? err.message
            : "The website could not be scanned.",
      );
    } finally {
      clearTimeout(timeout);
      stopTimers();
      if (controllerRef.current === controller) controllerRef.current = null;
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (url.trim()) void run(url);
  };

  const cancel = () => {
    controllerRef.current?.abort("user-cancelled");
    setLoading(false);
    stopTimers();
  };

  const demo = (level: keyof typeof mockReports) => {
    const next = { ...mockReports[level], scannedAt: new Date().toISOString() };
    setReport(next);
    onResult?.(next);
    setError("");
    setTimeout(() => document.getElementById("scan-report")?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const stages = enhanced && !compact ? enhancedScanStages : standardScanStages;

  return (
    <>
      <div className={compact ? "" : "scanner-shell"}>
        <form className="scan-form" onSubmit={submit} aria-busy={loading}>
          <label htmlFor={inputId}>Public website URL</label>
          <div className="input-row">
            <div className="url-input"><ScanSearch size={20} /><input id={inputId} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="example.com" autoComplete="url" inputMode="url" aria-describedby={statusId} disabled={loading} required spellCheck={false} /></div>
            <button className="button button-primary" disabled={loading} type="submit">{loading ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}{loading ? "Analyzing" : enhanced && !compact ? "Enhanced scan" : "Scan website"}</button>
            {loading && <button className="button button-secondary scan-cancel" type="button" onClick={cancel}><X size={16} />Cancel</button>}
          </div>
          {!compact && (
            <div className={`scan-mode-choice ${enhanced ? "is-enhanced" : ""}`}>
              <label htmlFor={enhancedId}>
                <input id={enhancedId} type="checkbox" checked={enhanced} onChange={(event) => setEnhanced(event.target.checked)} disabled={loading} />
                <span className="scan-mode-icon"><Sparkles size={16} /></span>
                <span><strong>Enhanced scan</strong><small>Use this when you want the fuller scan. Some sites add trackers, ads, forms, or scripts only after the page finishes loading. Enhanced scan checks that loaded page too. It may take longer. No login, clicks, forms, or personal browser data.</small></span>
              </label>
            </div>
          )}
          <div id={statusId} className="scan-status" aria-live="polite">
            {loading && (
              <div className="scan-progress">
                <div className="scan-progress-head"><span><LoaderCircle className="spin" size={15} />{stages[stage]}</span><strong>{stage + 1}/{stages.length}</strong></div>
                <div className="scan-progress-track"><span style={{ width: `${((stage + 1) / stages.length) * 100}%` }} /></div>
                {!compact && <p>{enhanced ? "Enhanced scan can find more because it checks the page after it finishes loading, but it may take longer than Standard scan." : "Most scans finish in under ten seconds. Slow or blocked origins may take longer."}</p>}
              </div>
            )}
            {error && (
              <div className="scan-error" role="alert">
                <AlertCircle size={18} />
                <div><strong>Scan could not complete</strong><span>{error}</span><p>{explainScanError(error)}</p></div>
                <button type="button" onClick={() => void run(url)}><RotateCcw size={14} />Retry</button>
              </div>
            )}
            {!loading && !error && <span className="scan-ready"><Check size={13} />Ready for {enhanced && !compact ? "Enhanced" : "Standard"} scan</span>}
          </div>
        </form>
        {!compact && (
          <div className="demo-row">
            <span>Open a clearly labeled sample report</span>
            {demoProfiles.map((profile) => (
              <button type="button" onClick={() => demo(profile.key)} key={profile.key}>
                <PlayCircle size={15} /><span><strong>{profile.label}</strong><small>{profile.detail}</small></span>
              </button>
            ))}
          </div>
        )}
      </div>
      {report && !onResult && <div id="scan-report" className="report-anchor report-inline standalone-report-shell"><ReportView report={report} /></div>}
    </>
  );
}
