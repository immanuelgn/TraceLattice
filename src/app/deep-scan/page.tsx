import type { Metadata } from "next";
import { DeepScanExperience } from "@/components/DeepScanExperience";
import { SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = {
  title: "Local deep scan",
  description: "Open or import a TraceLattice Playwright runtime report generated locally.",
};

export default function DeepScanPage() {
  return (
    <div className="page-shell deep-page">
      <div className="container">
        <SectionHeading
          eyebrow="Playwright companion scanner"
          title="Observe what happens after JavaScript runs."
          copy="Run the scanner locally, then review runtime requests, browser state, trackers, WebSockets, and JavaScript-loaded third parties in this interface."
        />
      </div>
      <DeepScanExperience />
    </div>
  );
}
