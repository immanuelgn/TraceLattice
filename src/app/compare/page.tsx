import type { Metadata } from "next";
import { CompareExperience } from "@/components/CompareExperience";
import { DisclaimerBanner, SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = { title: "Compare websites", description: "Compare two public origins across observable privacy and security signals." };
export default function ComparePage() {
  return <div className="page-shell container"><SectionHeading eyebrow="Side-by-side analysis" title="Compare observable web posture." copy="Run two independent bounded scans and compare the public-facing signals each origin exposes." /><DisclaimerBanner /><CompareExperience /></div>;
}
