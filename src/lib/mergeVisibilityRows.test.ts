import { describe, it, expect } from "vitest";
import { mergeVisibilityRows, type MergeAuditRow, type MergeDirectoryFirm } from "./mergeVisibilityRows";

const fullyMeasuredAudit: MergeAuditRow = {
  audited_domain: "bdk-advokati.com",
  display_name: "BDK Advokati",
  peer_group: "local",
  verified_at: "2026-01-01T00:00:00Z",
  performance_score: 18,
  social_score: 15,
  seo_authority_score: 0,
  thought_leadership_score: 30,
  reputation_score: 40,
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
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [], 45);
    expect(rows).toHaveLength(1);
    // measured: 18+15+30+40 = 103 of (20+20+45+55=140), not 200 (60 excluded for missing SEO)
    expect(rows[0].measuredMax).toBe(140);
    expect(rows[0].measuredScore).toBe(103);
    expect(rows[0].visibilityPercent).toBe(Math.round((103 / 140) * 100));
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
    const rows = mergeVisibilityRows([], [directoryFirm], 45);
    expect(rows).toHaveLength(1);
    expect(rows[0].hasFullAudit).toBe(false);
    expect(rows[0].measuredMax).toBe(45);
    expect(rows[0].measuredCategoryCount).toBe(1);
    expect(rows[0].visibilityPercent).toBe(Math.round((20 / 45) * 100));
  });

  it("deduplicates a firm that appears in both sources, keeping only the richer audited row", () => {
    const directoryFirm: MergeDirectoryFirm = {
      firmName: "BDK Advokati",
      firmDomain: "bdk-advokati.com",
      firmType: "L",
      directoryPoints: 27,
    };
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [directoryFirm], 45);
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
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [directoryFirm], 45);
    expect(rows).toHaveLength(2);
  });

  it("sorts by visibility percent descending across both sources", () => {
    const lowDirectoryFirm: MergeDirectoryFirm = {
      firmName: "Low Firm", firmDomain: "low.com", firmType: "L", directoryPoints: 2,
    };
    const rows = mergeVisibilityRows([fullyMeasuredAudit], [lowDirectoryFirm], 45);
    expect(rows[0].firmName).toBe("BDK Advokati");
    expect(rows[1].firmName).toBe("Low Firm");
  });

  it("handles a directory firm with no domain at all without crashing", () => {
    const noDomainFirm: MergeDirectoryFirm = {
      firmName: "No Domain Firm", firmDomain: null, firmType: null, directoryPoints: 5,
    };
    const rows = mergeVisibilityRows([], [noDomainFirm], 45);
    expect(rows).toHaveLength(1);
    expect(rows[0].peerGroup).toBe("other");
  });

  const NOW = new Date("2026-07-29T00:00:00.000Z").getTime();

  it("flags an audited firm as stale past AUDIT_STALE_AFTER_DAYS since verified_at", () => {
    const stale: MergeAuditRow = { ...fullyMeasuredAudit, verified_at: "2026-01-01T00:00:00Z" };
    const fresh: MergeAuditRow = { ...fullyMeasuredAudit, audited_domain: "fresh.com", verified_at: "2026-07-20T00:00:00Z" };
    const rows = mergeVisibilityRows([stale, fresh], [], 45, NOW);
    expect(rows.find((r) => r.firmDomain === "bdk-advokati.com")?.isStale).toBe(true);
    expect(rows.find((r) => r.firmDomain === "fresh.com")?.isStale).toBe(false);
  });

  it("flags a directory-only firm as stale past DIRECTORY_STALE_AFTER_DAYS since lastVerifiedAt", () => {
    const staleDirectory: MergeDirectoryFirm = {
      firmName: "Old Data Firm", firmDomain: "old.com", firmType: "L", directoryPoints: 10, lastVerifiedAt: "2026-01-01T00:00:00Z",
    };
    const rows = mergeVisibilityRows([], [staleDirectory], 45, NOW);
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
