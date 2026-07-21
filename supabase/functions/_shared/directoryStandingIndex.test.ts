import { describe, it, expect } from "vitest";
import { computeDirectoryStandingIndex, DIRECTORY_INDEX_MAX } from "./directoryStandingIndex";
import type { DirectoryRow } from "./reputationScore";

const row = (overrides: Partial<DirectoryRow>): DirectoryRow => ({
  firm_name: "Firm",
  firm_domain: null,
  firm_type: null,
  chambers: null,
  legal500: null,
  iflr1000: null,
  ...overrides,
});

describe("computeDirectoryStandingIndex", () => {
  it("returns an empty list for an unconfigured market", () => {
    expect(computeDirectoryStandingIndex("atlantis", [row({ firm_name: "A" })])).toEqual([]);
  });

  it("ranks a firm with more/deeper rankings above one with fewer", () => {
    const rows = [
      row({ firm_name: "Strong Firm", chambers: { rankedTables: { BF: 1, CO: 1, CC: 1 } }, legal500: { rankedTables: { BF: 1, CC: 1 } } }),
      row({ firm_name: "Weak Firm", chambers: { rankedTables: { BF: 4 } } }),
    ];
    const result = computeDirectoryStandingIndex("serbia", rows);
    expect(result[0].firmName).toBe("Strong Firm");
    expect(result[0].directoryPoints).toBeGreaterThan(result[1].directoryPoints);
    expect(result.every((r) => r.directoryPoints <= DIRECTORY_INDEX_MAX)).toBe(true);
  });

  it("normalizes peer averages within the same firm_type, not the whole market", () => {
    const rows = [
      row({ firm_name: "Intl A", firm_type: "I", chambers: { rankedTables: { BF: 1 } } }),
      row({ firm_name: "Intl B", firm_type: "I", chambers: { rankedTables: { BF: 4 } } }),
      row({ firm_name: "Local A", firm_type: "L", chambers: { rankedTables: { BF: 1 } } }),
    ];
    const result = computeDirectoryStandingIndex("serbia", rows);
    const intlA = result.find((r) => r.firmName === "Intl A")!;
    const localA = result.find((r) => r.firmName === "Local A")!;
    // Both are the best-ranked firm within their own firm_type peer group,
    // so their quality sub-score should be identical even though "Intl B"
    // (a much weaker peer) only shares a group with Intl A.
    expect(intlA.chambers.points).toBeCloseTo(localA.chambers.points, 5);
  });

  it("sorts descending by total directory points", () => {
    const rows = [
      row({ firm_name: "Low", chambers: { rankedTables: { BF: 4 } } }),
      row({ firm_name: "High", chambers: { rankedTables: { BF: 1, CO: 1, CC: 1, DR: 1 } }, legal500: { rankedTables: { BF: 1, CC: 1 } } }),
      row({ firm_name: "Mid", chambers: { rankedTables: { BF: 2 } } }),
    ];
    const result = computeDirectoryStandingIndex("serbia", rows);
    expect(result.map((r) => r.firmName)).toEqual(["High", "Mid", "Low"]);
  });
});
