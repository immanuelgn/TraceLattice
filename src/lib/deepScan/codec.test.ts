import { describe, expect, it } from "vitest";
import { validateDeepScanReport } from "./codec";

describe("validateDeepScanReport", () => {
  it("accepts the supported local runtime schema", () => {
    const report = validateDeepScanReport({
      schemaVersion: 1,
      source: "tracelattice-local-runtime",
      summary: {},
      page: {},
      mainResponse: {},
      findings: [],
    });
    expect(report.source).toBe("tracelattice-local-runtime");
  });

  it("rejects unrelated JSON", () => {
    expect(() => validateDeepScanReport({ source: "unknown" })).toThrow("Unsupported");
  });
});
