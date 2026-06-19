import { describe, expect, it } from "vitest";
import { extractThirdParties } from "./extractThirdParties";

describe("extractThirdParties", () => {
  it("treats separate Vercel app subdomains as separate sites", () => {
    const result = extractThirdParties({
      resources: [
        { type: "script", url: "https://other-tool.vercel.app/runtime.js" },
        { type: "script", url: "https://royalepro.vercel.app/app.js" },
      ],
      inlineScriptCount: 0,
      externalScriptCount: 2,
    }, "https://royalepro.vercel.app/");

    expect(result.resources[0].thirdParty).toBe(true);
    expect(result.resources[1].thirdParty).toBe(false);
  });
});
