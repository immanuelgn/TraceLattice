import type { Metadata } from "next";
import { RecentScans } from "@/components/RecentScans";
import { SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = { title: "Recent scans", description: "Browser-local TraceLattice scan summaries." };
export default function RecentPage() {
  return <div className="page-shell container"><SectionHeading eyebrow="Local by default" title="Recent scan summaries." copy="This history lives only in your browser. Full reports, HTML, and cookie values are never stored." /><RecentScans /></div>;
}
