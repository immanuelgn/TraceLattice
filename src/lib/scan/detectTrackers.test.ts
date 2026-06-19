import { describe, expect, it } from "vitest";
import { detectTrackers } from "./detectTrackers";

describe("detectTrackers", () => {
  it("classifies known static references", () => {
    const trackers = detectTrackers([{ type: "script", url: "https://www.google-analytics.com/a.js", domain: "www.google-analytics.com", thirdParty: true }]);
    expect(trackers[0].category).toBe("Analytics");
  });

  it("does not call functional CDNs trackers", () => {
    const trackers = detectTrackers([{ type: "script", url: "https://cdn.jsdelivr.net/a.js", domain: "cdn.jsdelivr.net", thirdParty: true }]);
    expect(trackers).toHaveLength(0);
  });
});
