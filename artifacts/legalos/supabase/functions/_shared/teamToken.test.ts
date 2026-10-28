import { describe, it, expect } from "vitest";
import { signTeamToken, verifyTeamToken, safePasswordEqual, TEAM_TOKEN_TTL_MS } from "./teamToken";

describe("teamToken", () => {
  it("accepts a fresh token signed with the same secret", async () => {
    const t = await signTeamToken("s3cret");
    expect(await verifyTeamToken("s3cret", t)).toBe(true);
  });

  it("rejects a different secret, a tampered token, and an expired one", async () => {
    const t = await signTeamToken("s3cret", 1_000);
    expect(await verifyTeamToken("other", t, 2_000)).toBe(false);
    expect(await verifyTeamToken("s3cret", t.replace(/.$/, "A"), 2_000)).toBe(false);
    expect(await verifyTeamToken("s3cret", t, 1_000 + TEAM_TOKEN_TTL_MS + 1)).toBe(false);
  });

  it("rejects non-strings and malformed values", async () => {
    for (const bad of [undefined, null, 5, "", "a.b.c", "x".repeat(500)]) {
      expect(await verifyTeamToken("s3cret", bad)).toBe(false);
    }
  });

  it("does not accept a token shaped like the customer access tokens", async () => {
    // access.ts tokens are b64u("workshop.<exp>").<sig> under a different key.
    const payload = btoa(`workshop.${Date.now() + 100000}`).replace(/=+$/, "");
    expect(await verifyTeamToken("s3cret", `${payload}.AAAA`)).toBe(false);
  });

  it("compares passwords without short-circuiting", async () => {
    expect(await safePasswordEqual("abc", "abc")).toBe(true);
    expect(await safePasswordEqual("abc", "abd")).toBe(false);
    expect(await safePasswordEqual("abc", "abcd")).toBe(false);
  });
});
