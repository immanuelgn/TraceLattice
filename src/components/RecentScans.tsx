"use client";

import { useEffect, useState } from "react";
import { Clock3, ExternalLink, Trash2 } from "lucide-react";
import type { RecentScan } from "@/lib/scan/types";
import { clearRecentScans, getRecentScans, removeRecentScan } from "@/lib/scan/storage";
import { EmptyState, Pill } from "./Primitives";

export function RecentScans() {
  const [items, setItems] = useState<RecentScan[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setItems(getRecentScans()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!items.length) return <EmptyState title="No local scan history yet" copy="Run a live or fictional demo scan, then choose “Save locally.” Only compact summaries are stored in this browser." />;

  return (
    <>
      <div className="recent-toolbar"><p>{items.length} locally stored scan summaries</p><button className="button button-secondary" onClick={() => { clearRecentScans(); setItems([]); }}><Trash2 size={16} />Clear all</button></div>
      <div className="recent-grid">
        {items.map((item) => (
          <article className="glass recent-card" key={`${item.domain}-${item.scannedAt}`}>
            <div className="recent-head"><div><span className="mono">{item.domain}</span><div className="recent-date"><Clock3 size={13} />{new Date(item.scannedAt).toLocaleString()}</div></div><div className="mini-grade">{item.grade}<small>{item.score}</small></div></div>
            <Pill tone={item.score >= 80 ? "green" : item.score >= 60 ? "amber" : "red"}>{item.riskLabel}</Pill>
            <div className="recent-stats"><span><strong>{item.trackerCount}</strong> trackers</span><span><strong>{item.cookieIssueCount}</strong> cookie issues</span><span><strong>{item.thirdPartyCount}</strong> third parties</span></div>
            <div className="recent-actions"><span className="mono"><ExternalLink size={13} />{item.finalUrl}</span><button className="icon-button" aria-label={`Remove ${item.domain}`} onClick={() => { removeRecentScan(item.domain); setItems(getRecentScans()); }}><Trash2 size={16} /></button></div>
          </article>
        ))}
      </div>
    </>
  );
}
