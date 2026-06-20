import type { DeepScanReport } from "./types";

const MAX_IMPORT_BYTES = 1_000_000;

export function validateDeepScanReport(value: unknown): DeepScanReport {
  if (!value || typeof value !== "object") throw new Error("The selected file is not a TraceLattice report.");
  const report = value as Partial<DeepScanReport>;
  if (report.schemaVersion !== 1 || report.source !== "tracelattice-local-runtime") {
    throw new Error("Unsupported deep-scan report format.");
  }
  if (!report.summary || !report.page || !report.mainResponse || !Array.isArray(report.findings)) {
    throw new Error("The deep-scan report is incomplete.");
  }
  return report as DeepScanReport;
}

export async function decodeDeepScanFragment(encoded: string) {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  if (text.length > MAX_IMPORT_BYTES) throw new Error("The report exceeds the viewer size limit.");
  return validateDeepScanReport(JSON.parse(text));
}

export async function readDeepScanFile(file: File) {
  if (file.size > MAX_IMPORT_BYTES) throw new Error("Select a TraceLattice report smaller than 1 MB.");
  return validateDeepScanReport(JSON.parse(await file.text()));
}
