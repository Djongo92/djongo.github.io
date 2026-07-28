import { describe, it, expect } from "vitest";
import { computePeerRank } from "./peerRank";

const firms = [
  { firmName: "Schoenherr", firmType: "R" },
  { firmName: "Karanović & Partners", firmType: "R" },
  { firmName: "BDK Advokati", firmType: "L" },
  { firmName: "Wolf Theiss", firmType: "R" },
  { firmName: "CMS", firmType: "I" },
  { firmName: "JPM & Partners", firmType: "L" },
];

describe("computePeerRank", () => {
  it("returns null for an empty directory", () => {
    expect(computePeerRank([], "Schoenherr")).toBeNull();
  });

  it("returns null when the firm isn't in the directory", () => {
    expect(computePeerRank(firms, "Nonexistent Firm")).toBeNull();
  });

  it("ranks within the matched firm's peer group, not the whole market", () => {
    // BDK Advokati is the 1st "L" (Local) firm in the sorted array — rank 1
    // of the 2 Local firms (BDK, JPM), not rank 3 of 6 overall.
    const result = computePeerRank(firms, "BDK Advokati");
    expect(result).not.toBeNull();
    expect(result!.rank).toBe(1);
    expect(result!.peerGroupSize).toBe(2);
    expect(result!.marketSize).toBe(6);
    expect(result!.peerGroupLabel).toBe("Local");
  });

  it("ranks a lower peer-group position correctly", () => {
    const result = computePeerRank(firms, "JPM & Partners");
    expect(result!.rank).toBe(2);
    expect(result!.peerGroupSize).toBe(2);
    expect(result!.percentile).toBe(0);
  });

  it("falls back to the whole market when firmType is missing", () => {
    const noType = [
      { firmName: "Firm A", firmType: null },
      { firmName: "Firm B", firmType: null },
    ];
    const result = computePeerRank(noType, "Firm B");
    expect(result!.rank).toBe(2);
    expect(result!.peerGroupSize).toBe(2);
    expect(result!.peerGroupLabel).toBe("tracked");
  });

  it("computes a sensible percentile for a top-ranked firm", () => {
    const result = computePeerRank(firms, "Schoenherr");
    // Schoenherr is rank 1 of 3 "R" (Regional) firms (Schoenherr, Karanović, Wolf Theiss).
    expect(result!.rank).toBe(1);
    expect(result!.peerGroupSize).toBe(3);
    expect(result!.percentile).toBe(Math.round((1 - 1 / 3) * 100));
  });
});
