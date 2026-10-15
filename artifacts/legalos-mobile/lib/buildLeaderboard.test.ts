import { describe, it, expect } from "vitest";
import { buildMergedLeaderboard } from "./buildLeaderboard";
import type { DirectoryIndexFirm, PeerAuditRow } from "./buildLeaderboard";
import type { Firm } from "@/context/DataContext";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FULL_PROV = {
  performance: "api",
  social: "api",
  seoAuthority: "api",
  thoughtLeadership: "api",
  reputation: "api",
};

interface CatScores {
  performance: number;
  social: number;
  seoAuthority: number;
  thoughtLeadership: number;
  reputation: number;
}

const cats = (
  performance: number,
  social: number,
  seoAuthority: number,
  thoughtLeadership: number,
  reputation: number,
): CatScores => ({ performance, social, seoAuthority, thoughtLeadership, reputation });

const totalOf = (c: CatScores) =>
  c.performance + c.social + c.seoAuthority + c.thoughtLeadership + c.reputation;

function auditRow(
  id: string,
  domain: string,
  c: CatScores,
  provenance: Record<string, string> = FULL_PROV,
  meta: Partial<Pick<PeerAuditRow, 'updated_at' | 'confidence_score' | 'sample_size'>> = {},
): PeerAuditRow {
  return {
    id,
    audited_domain: domain,
    display_name: null,
    total_score: totalOf(c),
    performance_score: c.performance,
    social_score: c.social,
    seo_authority_score: c.seoAuthority,
    thought_leadership_score: c.thoughtLeadership,
    reputation_score: c.reputation,
    provenance,
    ...meta,
  };
}

/** A fully-measured live firm: visibilityPercent = score ÷ 200. */
function liveFirm(domain: string, c: CatScores, overrides: Partial<Firm> = {}): Firm {
  const score = totalOf(c);
  return {
    id: `live-${domain}`,
    rank: 0,
    name: domain,
    domain,
    score,
    percentile: 25,
    isYou: true,
    visibilityPercent: Math.round((score / 200) * 100),
    hasFullAudit: true,
    performance: c.performance,
    social: c.social,
    seoAuthority: c.seoAuthority,
    thoughtLeadership: c.thoughtLeadership,
    reputation: c.reputation,
    provenance: FULL_PROV,
    ...overrides,
  };
}

function dirFirm(firmName: string, firmDomain: string | null, directoryPoints: number): DirectoryIndexFirm {
  return { firmName, firmDomain, directoryPoints };
}

const ranks = (list: Firm[]) => list.map((f) => ({ rank: f.rank, domain: f.domain || f.name }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildMergedLeaderboard — audit rows", () => {
  it("carries measured SEO & Authority scores into the ranked firm", () => {
    const rows = [
      auditRow("seo", "seo.rs", cats(12, 14, 30, 27, 32)),
      auditRow("other", "other.rs", cats(14, 14, 20, 27, 32)),
    ];
    const live = liveFirm("seo.rs", cats(12, 14, 30, 27, 32));

    const result = buildMergedLeaderboard(rows, [], "seo.rs", live);
    const seoFirm = result.find((f) => f.domain === "seo.rs")!;

    expect(seoFirm.seoAuthority).toBe(30);
    expect(seoFirm.provenance.seoAuthority).toBe("api");
    // Math.round(115/200 * 100) = 57 (IEEE 754: 0.575 * 100 = 57.499...)
    expect(seoFirm.visibilityPercent).toBe(57);
    expect(seoFirm.rank).toBe(1);
  });

  it("assigns 1-based ranks from market score ordering", () => {
    const rows = [
      auditRow("a", "a.rs", cats(20, 20, 20, 20, 20)), // 100 → 50%
      auditRow("b", "b.rs", cats(16, 16, 16, 16, 16)), // 80 → 40%
      auditRow("c", "c.rs", cats(12, 12, 12, 12, 12)), // 60 → 30%
    ];
    const live = liveFirm("b.rs", cats(16, 16, 16, 16, 16));

    const result = buildMergedLeaderboard(rows, [], "b.rs", live);

    expect(ranks(result)).toEqual([
      { rank: 1, domain: "a.rs" },
      { rank: 2, domain: "b.rs" },
      { rank: 3, domain: "c.rs" },
    ]);
  });

  it("marks the signed-in firm's entry with isYou=true", () => {
    const rows = [
      auditRow("a", "a.rs", cats(20, 20, 20, 20, 20)),
      auditRow("b", "b.rs", cats(16, 16, 16, 16, 16)),
    ];
    const live = liveFirm("b.rs", cats(16, 16, 16, 16, 16));

    const result = buildMergedLeaderboard(rows, [], "b.rs", live);

    expect(result.find((f) => f.domain === "b.rs")?.isYou).toBe(true);
    expect(result.find((f) => f.domain === "a.rs")?.isYou).toBeFalsy();
  });

  it("is case- and whitespace-insensitive when matching the current domain", () => {
    const rows = [auditRow("x", "  My-Firm.RS  ", cats(10, 10, 10, 10, 10))];
    const live = liveFirm("my-firm.rs", cats(10, 10, 10, 10, 10));

    const result = buildMergedLeaderboard(rows, [], "my-firm.rs", live);

    expect(result[0].isYou).toBe(true);
  });

  it("ranks by visibility percent, not raw total — a missing category shrinks the denominator", () => {
    // a: 100 fully-measured points → 100/200 = 50%.
    // b: 90 points with seoAuthority MISSING → 90/140 = 64% — outranks a
    //    despite the lower raw total (same rule as the web Visibility Index).
    const rows = [
      auditRow("a", "a.rs", cats(20, 20, 20, 20, 20)),
      auditRow("b", "b.rs", cats(25, 25, 0, 20, 20), { ...FULL_PROV, seoAuthority: "missing" }),
    ];
    const live = liveFirm("a.rs", cats(20, 20, 20, 20, 20));

    const result = buildMergedLeaderboard(rows, [], "a.rs", live);

    expect(result[0].domain).toBe("b.rs");
    expect(result[0].visibilityPercent).toBe(64);
    expect(result[1].domain).toBe("a.rs");
    expect(result[1].visibilityPercent).toBe(50);
  });

  describe("when the signed-in firm is not in the public list", () => {
    it("splices the firm at the correct percent position and renumbers ranks", () => {
      const rows = [
        auditRow("a", "a.rs", cats(20, 20, 20, 20, 20)), // 100 → 50%
        auditRow("c", "c.rs", cats(12, 12, 12, 12, 12)), // 60 → 30%
      ];
      // live firm scores 80 → 40% — should land between a.rs and c.rs
      const live = liveFirm("b.rs", cats(16, 16, 16, 16, 16));

      const result = buildMergedLeaderboard(rows, [], "b.rs", live);

      expect(ranks(result)).toEqual([
        { rank: 1, domain: "a.rs" },
        { rank: 2, domain: "b.rs" },
        { rank: 3, domain: "c.rs" },
      ]);
      expect(result[1].isYou).toBe(true);
    });

    it("places the firm last when it has the lowest percent", () => {
      const rows = [
        auditRow("a", "a.rs", cats(20, 20, 20, 20, 20)),
        auditRow("b", "b.rs", cats(16, 16, 16, 16, 16)),
      ];
      const live = liveFirm("z.rs", cats(8, 8, 8, 8, 8)); // 40 → 20%

      const result = buildMergedLeaderboard(rows, [], "z.rs", live);

      expect(result[result.length - 1].domain).toBe("z.rs");
      expect(result[result.length - 1].rank).toBe(3);
    });

    it("places the firm first when it has the highest percent", () => {
      const rows = [
        auditRow("b", "b.rs", cats(16, 16, 16, 16, 16)),
        auditRow("c", "c.rs", cats(12, 12, 12, 12, 12)),
      ];
      const live = liveFirm("a.rs", cats(24, 24, 24, 24, 24)); // 120 → 60%

      const result = buildMergedLeaderboard(rows, [], "a.rs", live);

      expect(result[0].domain).toBe("a.rs");
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
    });

    it("produces no duplicate ranks when the firm is spliced in", () => {
      const rows = [
        auditRow("a", "a.rs", cats(20, 20, 20, 20, 20)),
        auditRow("b", "b.rs", cats(16, 16, 16, 16, 16)),
        auditRow("c", "c.rs", cats(12, 12, 12, 12, 12)),
      ];
      const live = liveFirm("d.rs", cats(14, 14, 14, 14, 14)); // 70 → 35%

      const result = buildMergedLeaderboard(rows, [], "d.rs", live);
      const resultRanks = result.map((f) => f.rank);

      expect(resultRanks).toEqual([1, 2, 3, 4]);
    });
  });

  it("peer group is a subset of market: rank reflects market position, not peer_group position", () => {
    const rows = [
      auditRow("a", "a.rs", cats(24, 24, 24, 24, 24)), // 120, different peer_group
      auditRow("b", "b.rs", cats(20, 20, 20, 20, 20)), // 100, signed-in, boutique
      auditRow("c", "c.rs", cats(16, 16, 16, 16, 16)), // 80, different peer_group
      auditRow("d", "d.rs", cats(12, 12, 12, 12, 12)), // 60, boutique
    ];
    const live = liveFirm("b.rs", cats(20, 20, 20, 20, 20));

    const result = buildMergedLeaderboard(rows, [], "b.rs", live);

    const selfEntry = result.find((f) => f.isYou)!;
    expect(selfEntry.rank).toBe(2); // market rank, not peer_group rank (which would be 1)
    const above = result.find((f) => f.rank === selfEntry.rank - 1);
    expect(above?.domain).toBe("a.rs");
  });

  it("returns a list that always includes the signed-in firm", () => {
    const live = liveFirm("x.rs", cats(10, 10, 10, 10, 10));

    const result = buildMergedLeaderboard([], [], "x.rs", live);

    expect(result.length).toBe(1);
    expect(result[0].isYou).toBe(true);
    expect(result[0].rank).toBe(1);
  });
});

describe("buildMergedLeaderboard — directory-standing merge", () => {
  it("merges directory-only firms alongside audits, ranked by their own percent scale", () => {
    const rows = [auditRow("a", "a.rs", cats(20, 20, 20, 20, 20))]; // 100/200 → 50%
    // 40 of the directory's 45 → 89% — ranks above the audited firm.
    const dirs = [dirFirm("DirTracked & Co", "dir.rs", 40)];
    const live = liveFirm("a.rs", cats(20, 20, 20, 20, 20));

    const result = buildMergedLeaderboard(rows, dirs, "a.rs", live);

    expect(result[0].name).toBe("DirTracked & Co");
    expect(result[0].hasFullAudit).toBe(false);
    expect(result[0].score).toBe(40);
    expect(result[0].visibilityPercent).toBe(89);
    expect(result[0].provenance.reputation).toBe("missing");
    expect(result[0].id).toBe("dir-dir.rs");
    expect(result[1].domain).toBe("a.rs");
  });

  it("shows a firm present in both sources once, via its richer full-audit row", () => {
    const rows = [auditRow("a", "a.rs", cats(20, 20, 20, 20, 20))];
    const dirs = [dirFirm("A Law (directory name)", "A.RS", 45)];
    const live = liveFirm("a.rs", cats(20, 20, 20, 20, 20));

    const result = buildMergedLeaderboard(rows, dirs, "a.rs", live);

    const matches = result.filter((f) => f.domain.toLowerCase() === "a.rs");
    expect(matches.length).toBe(1);
    expect(matches[0].hasFullAudit).toBe(true);
    expect(matches[0].score).toBe(100);
  });

  it("keeps directory firms with no domain (they can't be matched to an audit)", () => {
    const rows = [auditRow("a", "a.rs", cats(20, 20, 20, 20, 20))];
    const dirs = [dirFirm("Domainless Firm", null, 30)];
    const live = liveFirm("a.rs", cats(20, 20, 20, 20, 20));

    const result = buildMergedLeaderboard(rows, dirs, "a.rs", live);

    expect(result.some((f) => f.name === "Domainless Firm")).toBe(true);
  });

  it("skips the signed-in firm's directory row — its richer live entry is used instead", () => {
    // Signed-in firm's audit is NOT published (absent from rows), but the
    // directories track it. It must appear exactly once, as the full-audit
    // self entry, not duplicated as a directory-only row.
    const rows = [auditRow("a", "a.rs", cats(20, 20, 20, 20, 20))];
    const dirs = [dirFirm("My Firm (directory)", "my-firm.rs", 44)];
    const live = liveFirm("my-firm.rs", cats(12, 12, 12, 12, 12)); // 60 → 30%

    const result = buildMergedLeaderboard(rows, dirs, "my-firm.rs", live);

    const selfEntries = result.filter((f) => f.domain === "my-firm.rs");
    expect(selfEntries.length).toBe(1);
    expect(selfEntries[0].isYou).toBe(true);
    expect(selfEntries[0].hasFullAudit).toBe(true);
    expect(result.some((f) => f.name === "My Firm (directory)")).toBe(false);
  });

  it("breaks percent ties on absolute score so ordering is deterministic", () => {
    const rows = [
      // y: 70 measured of 140 (seoAuthority missing) → 50%, score 70
      auditRow("y", "y.rs", cats(20, 20, 0, 15, 15), { ...FULL_PROV, seoAuthority: "missing" }),
      // x: 100 of 200 → 50%, score 100 — wins the tie
      auditRow("x", "x.rs", cats(20, 20, 20, 20, 20)),
    ];
    const live = liveFirm("x.rs", cats(20, 20, 20, 20, 20));

    const result = buildMergedLeaderboard(rows, [], "x.rs", live);

    expect(result[0].domain).toBe("x.rs");
    expect(result[1].domain).toBe("y.rs");
    expect(result[0].visibilityPercent).toBe(result[1].visibilityPercent);
  });

  it("carries freshness + thin-peer metadata onto audit rows, and leaves directory rows without it", () => {
    const rows = [
      auditRow("a", "a.rs", cats(20, 20, 20, 20, 20), FULL_PROV, {
        updated_at: "2026-01-01T00:00:00Z",
        confidence_score: 0.6,
        sample_size: 3,
      }),
    ];
    const dirs = [dirFirm("DirTracked & Co", "dir.rs", 40)];
    const live = liveFirm("a.rs", cats(20, 20, 20, 20, 20));

    const result = buildMergedLeaderboard(rows, dirs, "a.rs", live);

    const auditEntry = result.find((f) => f.domain === "a.rs")!;
    expect(auditEntry.auditedAt).toBe("2026-01-01T00:00:00Z");
    expect(auditEntry.confidenceScore).toBe(0.6);
    expect(auditEntry.sampleSize).toBe(3);

    const dirEntry = result.find((f) => f.name === "DirTracked & Co")!;
    expect(dirEntry.auditedAt ?? null).toBeNull();
    expect(dirEntry.confidenceScore ?? null).toBeNull();
    expect(dirEntry.sampleSize ?? null).toBeNull();
  });

  it("leaves audit metadata null on pre-v2 rows (columns absent)", () => {
    const rows = [auditRow("a", "a.rs", cats(20, 20, 20, 20, 20))];
    const live = liveFirm("a.rs", cats(20, 20, 20, 20, 20));

    const result = buildMergedLeaderboard(rows, [], "a.rs", live);

    expect(result[0].auditedAt).toBeNull();
    expect(result[0].confidenceScore).toBeNull();
    expect(result[0].sampleSize).toBeNull();
  });

  it("an empty directory list degrades to the audits-only leaderboard", () => {
    const rows = [
      auditRow("a", "a.rs", cats(20, 20, 20, 20, 20)),
      auditRow("b", "b.rs", cats(16, 16, 16, 16, 16)),
    ];
    const live = liveFirm("b.rs", cats(16, 16, 16, 16, 16));

    const result = buildMergedLeaderboard(rows, [], "b.rs", live);

    expect(result.length).toBe(2);
    expect(result.every((f) => f.hasFullAudit)).toBe(true);
  });
});
