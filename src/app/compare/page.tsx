import type { Metadata } from "next";
import { CompareExperience } from "@/components/CompareExperience";
import { DisclaimerBanner, SectionHeading } from "@/components/Primitives";

export const metadata: Metadata = { title: "Compare websites", description: "Compare two public homepages across static privacy and security signals." };
export default function ComparePage() {
  return <div className="page-shell container"><SectionHeading eyebrow="Side-by-side intelligence" title="Compare observable privacy posture." copy="Run two independent static homepage scans and see which site presents the stronger public-facing baseline." /><DisclaimerBanner /><CompareExperience /></div>;
}
