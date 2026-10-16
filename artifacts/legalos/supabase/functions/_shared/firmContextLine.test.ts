// Regression fixture for task #142: a Warsaw-briefed firmContext must put the
// market into the prompt, and the jurisdiction rule must explicitly ban the
// US regulators the model previously invented (FMLA, Department of Labor).
import { describe, it, expect } from "vitest";
import { firmContextLine, resolveEffectiveMarket, JURISDICTION_RULE } from "./firmContextLine";

const WARSAW_BOUTIQUE = {
  practiceArea: "Employment law",
  firmSize: "boutique (12 lawyers)",
  primaryGoal: "More referrals from in-house counsel",
  market: "Poland",
};

describe("firmContextLine", () => {
  it("includes the market when present", () => {
    const line = firmContextLine(WARSAW_BOUTIQUE);
    expect(line).toContain("primary market: Poland");
    expect(line).toContain("Employment law practice");
    expect(line).toContain("primary goal: More referrals from in-house counsel");
  });

  it("omits the market cleanly for pre-#142 profiles that never set one", () => {
    const { market: _omitted, ...legacy } = WARSAW_BOUTIQUE;
    const line = firmContextLine(legacy);
    expect(line).not.toContain("market");
    expect(line).toContain("Employment law practice");
  });

  it("returns an empty string for missing or malformed context", () => {
    expect(firmContextLine(null)).toBe("");
    expect(firmContextLine(undefined)).toBe("");
    expect(firmContextLine({})).toBe("");
  });
});

describe("jurisdiction precedence (task #147)", () => {
  // Two fields can carry a market into one prompt: server-side
  // firm_profiles.jurisdictions and client-side firm_context.market. Without
  // a winner a prompt could brief Poland AND Czechia at once. The firm
  // profile — firm-scoped, verified, deliberately maintained — wins.
  it("resolveEffectiveMarket: profile jurisdictions beat the client market", () => {
    expect(resolveEffectiveMarket("Czechia", ["Poland"])).toEqual({ market: "Poland", source: "profile" });
    expect(resolveEffectiveMarket("Czechia", ["Poland", "Germany"]).market).toBe("Poland");
  });

  it("resolveEffectiveMarket: client market is the fallback when the profile has none", () => {
    expect(resolveEffectiveMarket("Czechia", [])).toEqual({ market: "Czechia", source: "client" });
    expect(resolveEffectiveMarket("Czechia", null)).toEqual({ market: "Czechia", source: "client" });
    expect(resolveEffectiveMarket("Czechia", ["", "  "])).toEqual({ market: "Czechia", source: "client" });
  });

  it("resolveEffectiveMarket: neither set resolves to none", () => {
    expect(resolveEffectiveMarket(undefined, null)).toEqual({ source: "none" });
    expect(resolveEffectiveMarket("  ", [])).toEqual({ source: "none" });
  });

  it("firmContextLine suppresses a conflicting client market when the profile has jurisdictions", () => {
    // The profile block already renders "Jurisdictions: Poland" — the line
    // must NOT also carry "primary market: Czechia" beside it.
    const line = firmContextLine({ ...WARSAW_BOUTIQUE, market: "Czechia" }, ["Poland"]);
    expect(line).not.toContain("Czechia");
    expect(line).not.toContain("primary market");
    expect(line).toContain("Employment law practice");
  });

  it("firmContextLine keeps the client market when the profile has no jurisdictions", () => {
    expect(firmContextLine(WARSAW_BOUTIQUE, [])).toContain("primary market: Poland");
    expect(firmContextLine(WARSAW_BOUTIQUE, null)).toContain("primary market: Poland");
  });
});

describe("JURISDICTION_RULE", () => {
  it("names the US regulators the model must not invent for non-US firms", () => {
    expect(JURISDICTION_RULE).toContain("FMLA");
    expect(JURISDICTION_RULE).toContain("Department of Labor");
    expect(JURISDICTION_RULE).toContain("that market's jurisdiction");
  });

  it("names the precedence: firm profile jurisdictions are authoritative (task #147)", () => {
    expect(JURISDICTION_RULE).toContain("FIRM PROFILE");
    expect(JURISDICTION_RULE).toContain("authoritative");
    expect(JURISDICTION_RULE).toContain("historical record");
  });
});
