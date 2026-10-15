import { describe, expect, it } from "vitest";
import { AUDIT_LOADING_TIPS, nextAuditLoadingTipIndex } from "./auditLoadingTips";

describe("audit loading tips", () => {
  it("contains useful, non-empty tips", () => {
    expect(AUDIT_LOADING_TIPS.length).toBeGreaterThan(1);
    for (const tip of AUDIT_LOADING_TIPS) {
      expect(tip.title).not.toHaveLength(0);
      expect(tip.body).not.toHaveLength(0);
    }
  });

  it("cycles from the final tip back to the first", () => {
    expect(nextAuditLoadingTipIndex(AUDIT_LOADING_TIPS.length - 1)).toBe(0);
    expect(nextAuditLoadingTipIndex(0)).toBe(1);
  });
});