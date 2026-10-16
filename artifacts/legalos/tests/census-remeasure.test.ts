import { describe, expect, it } from "vitest";
// @ts-ignore — plain-JS module, no type declarations
import { missingAuditCategories, recoveryReport } from "../scripts/census/censusLib.mjs";

describe("missing-category recovery reporting", () => {
  it("finds only category-level missing provenance", () => {
    expect(missingAuditCategories({
      performance: "api",
      seoAuthority: "missing",
      reputation: "missing",
      note: "missing",
    })).toEqual(["seoAuthority", "reputation"]);
  });

  it("reports recovered and still-missing categories independently", () => {
    expect(recoveryReport(
      { seoAuthority: "missing", reputation: "missing", performance: "api" },
      { seoAuthority: "api", reputation: "missing", performance: "api" },
    )).toEqual({
      previouslyMissing: ["seoAuthority", "reputation"],
      recovered: ["seoAuthority"],
      stillMissing: ["reputation"],
    });
  });
});