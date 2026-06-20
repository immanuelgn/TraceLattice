import { describe, expect, it } from "vitest";
import { mockReports } from "./mockReports";
import { calculateWeightedScore } from "./scoring";

describe("mockReports", () => {
  it("keeps every displayed demo score consistent with its component math", () => {
    Object.values(mockReports).forEach((report) => {
      expect(report.source.kind).toBe("demo");
      expect(report.score.value).toBe(calculateWeightedScore(report.score.components));
    });
  });
});
