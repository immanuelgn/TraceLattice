import { describe, expect, it } from "vitest";
import { analyzeCookies } from "./analyzeCookies";

describe("analyzeCookies", () => {
  it("never returns cookie values and flags missing protections", () => {
    const [cookie] = analyzeCookies(["session=super-secret; Path=/; SameSite=None"]);
    expect(JSON.stringify(cookie)).not.toContain("super-secret");
    expect(cookie.name).toBe("session");
    expect(cookie.category).toBe("session");
    expect(cookie.risk).toBe("high");
    expect(cookie.issues).toContain("SameSite=None without Secure");
  });

  it("does not treat client-side preference cookies like session secrets", () => {
    const [cookie] = analyzeCookies(["CONSENT=yes; Path=/; Secure; SameSite=Lax; Expires=Wed, 09 Jun 2027 10:18:14 GMT"]);
    expect(cookie.category).toBe("preference");
    expect(cookie.issues).toContain("Client-readable cookie");
    expect(cookie.risk).toBe("low");
  });
});
