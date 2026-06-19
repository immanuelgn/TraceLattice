import { describe, expect, it } from "vitest";
import { isBlockedIp, normalizeUrl } from "./validateUrl";

describe("normalizeUrl", () => {
  it("adds HTTPS when the protocol is omitted", () => {
    expect(normalizeUrl("example.com").toString()).toBe("https://example.com/");
  });

  it("rejects unsafe protocols and embedded credentials", () => {
    expect(() => normalizeUrl("file:///etc/passwd")).toThrow();
    expect(() => normalizeUrl("https://user:pass@example.com")).toThrow();
  });

  it("rejects arbitrary ports", () => {
    expect(() => normalizeUrl("https://example.com:8080")).toThrow();
  });
});

describe("isBlockedIp", () => {
  it.each(["127.0.0.1", "10.0.0.7", "172.16.2.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1"])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it("allows a public address", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
  });
});
