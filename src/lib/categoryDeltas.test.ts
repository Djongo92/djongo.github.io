import { describe, it, expect } from "vitest";
import { computeCategoryDeltas } from "./categoryDeltas";

const primary = { audited_domain: "example.com", market: "serbia" };

describe("computeCategoryDeltas", () => {
  it("labels 'since' with the PREVIOUS audit's date, not the latest (defect 1.5)", () => {
    const history = [
      { audited_domain: "example.com", market: "serbia", recorded_at: "2026-07-10T00:00:00Z", performance_score: 10, social_score: 8 },
      { audited_domain: "example.com", market: "serbia", recorded_at: "2026-07-27T00:00:00Z", performance_score: 15, social_score: 8 },
    ];
    const result = computeCategoryDeltas(history, primary);
    expect(result).not.toBeNull();
    expect(result!.recordedAt).toBe("2026-07-10T00:00:00Z");
    expect(result!.recordedAt).not.toBe("2026-07-27T00:00:00Z");
  });

  it("only includes categories that actually moved", () => {
    const history = [
      { audited_domain: "example.com", market: "serbia", recorded_at: "2026-07-10T00:00:00Z", performance_score: 10, social_score: 8 },
      { audited_domain: "example.com", market: "serbia", recorded_at: "2026-07-27T00:00:00Z", performance_score: 15, social_score: 8 },
    ];
    const result = computeCategoryDeltas(history, primary);
    expect(result!.deltas).toEqual([{ key: "performance", delta: 5 }]);
  });

  it("returns null with fewer than two recorded audits", () => {
    const history = [
      { audited_domain: "example.com", market: "serbia", recorded_at: "2026-07-27T00:00:00Z", performance_score: 15 },
    ];
    expect(computeCategoryDeltas(history, primary)).toBeNull();
  });
});
