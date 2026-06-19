"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Scale, ShieldCheck } from "lucide-react";
import type { ScanReport } from "@/lib/scan/types";
import { UrlScanForm } from "./ScanExperience";
import { MetricCard, Pill, ScoreRing } from "./Primitives";

function verdictFor(first: ScanReport, second: ScanReport) {
  const delta = Math.abs(first.score.value - second.score.value);
  if (delta < 5) return { leader: null as ScanReport | null, delta, title: "The observed static posture is effectively tied." };
  const leader = first.score.value > second.score.value ? first : second;
  return { leader, delta, title: `${leader.domain} has the higher observed static posture score.` };
}

export function CompareExperience() {
  const [first, setFirst] = useState<ScanReport | null>(null);
  const [second, setSecond] = useState<ScanReport | null>(null);
  const verdict = useMemo(() => first && second ? verdictFor(first, second) : null, [first, second]);

  return (
    <div className="compare-stack">
      <div className="compare-inputs">
        <section className="glass compare-input"><Pill tone="cyan">Site A</Pill><UrlScanForm compact onResult={setFirst} /></section>
        <section className="glass compare-input"><Pill tone="violet">Site B</Pill><UrlScanForm compact onResult={setSecond} /></section>
      </div>
      {first && second ? (
        <>
          <section className="glass comparison-verdict">
            <Scale />
            <div><span className="eyebrow">Comparative finding</span><h2>{verdict?.title}</h2><p>This compares only observable homepage signals: headers, Set-Cookie attributes, static resources, and known tracker patterns. A higher score means lower observed static exposure in this scan, not that one organization is universally safer.</p></div>
          </section>
          <section className="compare-results">
            {[first, second].map((report, index) => (
              <article className={`glass compare-card ${verdict?.leader === report ? "winner" : ""}`} key={report.scanId}>
                <div className="compare-card-head"><div><Pill tone={index === 0 ? "cyan" : "violet"}>Site {index === 0 ? "A" : "B"}</Pill><h2>{report.domain}</h2></div>{verdict?.leader === report && <Pill tone="green"><ShieldCheck size={13} />Higher static score</Pill>}</div>
                <ScoreRing score={report.score.value} grade={report.score.grade} size="small" />
                <div className="comparison-metrics">
                  <MetricCard label="Headers" value={report.score.components.headers.value} detail={`${report.score.components.headers.label} posture`} />
                  <MetricCard label="Cookies" value={report.score.components.cookies.value} detail={`${report.cookies.filter((item) => item.issues.length).length} contextual issue(s)`} />
                  <MetricCard label="Exposure" value={report.score.components.exposure.value} detail={`${report.thirdParties.length} third-party domain(s)`} />
                  <MetricCard label="Confidence" value="Limited" detail="Static homepage only" />
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <div className="compare-prompt"><ArrowRight /><p>Run both scans to generate a side-by-side privacy and security comparison.</p></div>
      )}
    </div>
  );
}
