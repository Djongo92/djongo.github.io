import { describe, it, expect } from "vitest";
import { mergeVisibilityRows, type MergeAuditRow, type MergeDirectoryFirm } from "./mergeVisibilityRows";

const fullyMeasuredAudit: MergeAuditRow = {
  audited_domain: "bdk-advokati.com",
  display_name: "BDK Advokati",
  peer_group: "local",
  verified_at: "2026-01-01T00:00:00Z",
  performance_score: 45,
  social_score: 37.5,
  seo_authority_score: 0,
  thought_leadership_score: 75,
  reputation_score: 100,
  provenance: {
    performance: "api",
    social: "self_reported",
    seoAuthority: "missing",
    thoughtLeadership: "ai_classified",
    reputation: "api",
  },
};

describe("mergeVisibilityRows", () => {
  it("computes a fair measured-only percentage for an audited firm with one missing category", () => {
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [], 100);
    expect(rows).toHaveLength(1);
    // measured: 45+37.5+75+100 = 257.5 of (50+75+150+125=400), not 500 (Search Authority's 100 excluded)
    expect(rows[0].measuredMax).toBe(400);
    expect(rows[0].measuredScore).toBe(257.5);
    expect(rows[0].visibilityPercent).toBe(Math.round((257.5 / 400) * 100));
    expect(rows[0].hasFullAudit).toBe(true);
    expect(rows[0].measuredCategoryCount).toBe(4);
  });

  it("caps a directory-only firm's max at the directory ceiling, not the full Reputation max", () => {
    const directoryFirm: MergeDirectoryFirm = {
      firmName: "Gecić Law",
      firmDomain: "gecic-law.com",
      firmType: "L",
      directoryPoints: 20,
    };
    const rows = mergeVisibilityRows([], [directoryFirm], 100);
    expect(rows).toHaveLength(1);
    expect(rows[0].hasFullAudit).toBe(false);
    expect(rows[0].measuredMax).toBe(100);
    expect(rows[0].measuredCategoryCount).toBe(1);
    expect(rows[0].visibilityPercent).toBe(20);
  });

  it("deduplicates a firm that appears in both sources, keeping only the richer audited row", () => {
    const directoryFirm: MergeDirectoryFirm = {
      firmName: "BDK Advokati",
      firmDomain: "bdk-advokati.com",
      firmType: "L",
      directoryPoints: 27,
    };
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [directoryFirm], 100);
    expect(rows).toHaveLength(1);
    expect(rows[0].hasFullAudit).toBe(true);
  });

  it("keeps a directory firm whose domain doesn't match any audited firm", () => {
    const directoryFirm: MergeDirectoryFirm = {
      firmName: "Other Firm",
      firmDomain: "otherfirm.com",
      firmType: "L",
      directoryPoints: 10,
    };
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [directoryFirm], 100);
    expect(rows).toHaveLength(2);
  });

  it("sorts by visibility percent descending across both sources", () => {
    const lowDirectoryFirm: MergeDirectoryFirm = {
      firmName: "Low Firm", firmDomain: "low.com", firmType: "L", directoryPoints: 2,
    };
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [lowDirectoryFirm], 100);
    expect(rows[0].firmName).toBe("BDK Advokati");
    expect(rows[1].firmName).toBe("Low Firm");
  });

  it("handles a directory firm with no domain at all without crashing", () => {
    const noDomainFirm: MergeDirectoryFirm = {
      firmName: "No Domain Firm", firmDomain: null, firmType: null, directoryPoints: 5,
    };
    const rows = mergeVisibilityRows([], [noDomainFirm], 100);
    expect(rows).toHaveLength(1);
    expect(rows[0].peerGroup).toBe("other");
  });

  const NOW = new Date("2026-07-29T00:00:00.000Z").getTime();

  it("flags an audited firm as stale past AUDIT_STALE_AFTER_DAYS since verified_at", () => {
    const stale: MergeAuditRow = { ...fullyMeasuredAudit, verified_at: "2026-01-01T00:00:00Z" };
    const fresh: MergeAuditRow = { ...fullyMeasuredAudit, audited_domain: "fresh.com", verified_at: "2026-07-20T00:00:00Z" };
    const rows = mergeVisibilityRows([stale, fresh], [], 100, NOW);
    expect(rows.find((r) => r.firmDomain === "bdk-advokati.com")?.isStale).toBe(true);
    expect(rows.find((r) => r.firmDomain === "fresh.com")?.isStale).toBe(false);
  });

  it("flags an audited firm as stale when its own audit is fresh but the directory data behind its Reputation score is overdue", () => {
    const freshAuditStaleDirectory: MergeAuditRow = {
      ...fullyMeasuredAudit,
      audited_domain: "fresh-audit-stale-directory.com",
      verified_at: "2026-07-20T00:00:00Z", // fresh — 9 days before NOW
      raw_metrics: { reputation: { directoryLastVerifiedAt: "2026-01-01T00:00:00Z" } }, // stale — well past 120 days
    };
    const bothFresh: MergeAuditRow = {
      ...fullyMeasuredAudit,
      audited_domain: "both-fresh.com",
      verified_at: "2026-07-20T00:00:00Z",
      raw_metrics: { reputation: { directoryLastVerifiedAt: "2026-07-20T00:00:00Z" } },
    };
    const rows = mergeVisibilityRows([freshAuditStaleDirectory, bothFresh], [], 100, NOW);
    expect(rows.find((r) => r.firmDomain === "fresh-audit-stale-directory.com")?.isStale).toBe(true);
    expect(rows.find((r) => r.firmDomain === "both-fresh.com")?.isStale).toBe(false);
  });

  it("flags a directory-only firm as stale past DIRECTORY_STALE_AFTER_DAYS since lastVerifiedAt", () => {
    const staleDirectory: MergeDirectoryFirm = {
      firmName: "Old Data Firm", firmDomain: "old.com", firmType: "L", directoryPoints: 10, lastVerifiedAt: "2026-01-01T00:00:00Z",
    };
    const rows = mergeVisibilityRows([], [staleDirectory], 100, NOW);
    expect(rows[0].isStale).toBe(true);
  });

  it("computes peer-group sample size and flags low confidence below the threshold", () => {
    const localFirms: MergeDirectoryFirm[] = Array.from({ length: 3 }, (_, i) => ({
      firmName: `Local Firm ${i}`, firmDomain: `local${i}.com`, firmType: "L", directoryPoints: 5,
    }));
    const rows = mergeVisibilityRows([], localFirms, 45, NOW);
    expect(rows.every((r) => r.peerGroupSampleSize === 3)).toBe(true);
    expect(rows.every((r) => r.isLowConfidence)).toBe(true);
  });

  it("does not flag low confidence once the peer group reaches the sample threshold", () => {
    const localFirms: MergeDirectoryFirm[] = Array.from({ length: 6 }, (_, i) => ({
      firmName: `Local Firm ${i}`, firmDomain: `local${i}.com`, firmType: "L", directoryPoints: 5,
    }));
    const rows = mergeVisibilityRows([], localFirms, 45, NOW);
    expect(rows.every((r) => !r.isLowConfidence)).toBe(true);
  });
});

describe("categoryBreakdown", () => {
  it("marks a missing-provenance category as unmeasured, never as an earned zero", () => {
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [], 100);
    const breakdown = rows[0].categoryBreakdown!;
    expect(breakdown).toHaveLength(5);
    const seo = breakdown.find((c) => c.key === "seoAuthority")!;
    expect(seo.measured).toBe(false);
    expect(seo.max).toBe(100);
    const perf = breakdown.find((c) => c.key === "performance")!;
    expect(perf.measured).toBe(true);
    expect(perf.score).toBe(45);
    expect(perf.max).toBe(50);
    // The unmeasured category stays out of the denominator — same guard the percentage uses.
    expect(rows[0].measuredMax).toBe(400);
  });

  it("omits categoryBreakdown for directory-only rows — one measured input is not a breakdown", () => {
    const rows = mergeVisibilityRows(
      [],
      [{ firmName: "Gecić Law", firmDomain: "gecic-law.com", firmType: "L", directoryPoints: 20 }],
      45,
    );
    expect(rows[0].categoryBreakdown).toBeUndefined();
  });
});
