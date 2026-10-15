import { describe, it, expect, vi } from "vitest";

// The real module builds a Supabase client on import, which touches
// AsyncStorage/window — unavailable in the node test environment. These
// tests only exercise injected sources, so stub the module out entirely
// (same seam as peerLeaderboard.test.ts).
vi.mock("@/lib/supabase", () => ({
  supabase: {},
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
}));

import { loadSignedInData } from "./auditData";
import type { AuditSources, AuditRow, HistoryRow } from "./auditData";
import type { Firm } from "@/context/DataContext";
import { getCategories } from "./categories";
import { computeMeasuredTotals } from "./measuredScore";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FULL_PROV = {
  performance: "api",
  social: "api",
  seoAuthority: "api",
  thoughtLeadership: "api",
  reputation: "api",
};

function auditRow(overrides: Partial<AuditRow> = {}): AuditRow {
  return {
    id: "audit-1",
    firm_name: "Test Firm",
    firm_domain: "testfirm.rs",
    total_score: 100,
    performance_score: 10,
    social_score: 10,
    seo_authority_score: 30,
    thought_leadership_score: 25,
    reputation_score: 25,
    percentile: 20,
    market: "serbia",
    provenance: FULL_PROV,
    ...overrides,
  };
}

function historyRow(overrides: Partial<HistoryRow> = {}): HistoryRow {
  return {
    total_score: 95,
    recorded_at: "2026-07-15T10:00:00Z",
    raw_metrics: { pagespeed: 72 },
    provenance: FULL_PROV,
    confidence_score: 0.8,
    sample_size: 12,
    ...overrides,
  };
}

function sources(overrides: Partial<AuditSources>): AuditSources {
  return {
    callAuditGet: async () => ({ audits: [auditRow()], history: [] }),
    fetchPeers: async () => null,
    ...overrides,
  };
}

// ─── Failure branch — the reason this extraction exists ───────────────────────

describe("loadSignedInData failure branch", () => {
  it("fails explicitly when the audit call throws", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => { throw new Error("HTTP 500 from visibility-audit-get"); },
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("HTTP 500");
  });

  it("fails explicitly on a null body", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => null,
    }));
    expect(result.ok).toBe(false);
  });

  it("fails explicitly when audits is not an array (returns badly)", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({ audits: "not-an-array" as unknown as AuditRow[] }),
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("audits");
  });

  it("fails explicitly when history is not an array (returns badly)", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({ audits: [], history: {} as unknown as HistoryRow[] }),
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("history");
  });

  it("a signed-in account with no audits yet is NOT a failure", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({ audits: [], history: [] }),
    }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.hasAudit).toBe(false);
      expect(result.firm).toBeNull();
      expect(result.leaderboard).toBeNull();
    }
  });
});

// ─── Success mapping ──────────────────────────────────────────────────────────

describe("loadSignedInData success mapping", () => {
  it("maps the latest audit row into the firm and computes measured visibilityPercent", async () => {
    const result = await loadSignedInData("user-1", "token", sources({}));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.firm) return;
    expect(result.hasAudit).toBe(true);
    expect(result.firm.name).toBe("Test Firm");
    expect(result.firm.domain).toBe("testfirm.rs");
    expect(result.firm.isYou).toBe(true);
    expect(result.firm.score).toBe(100);
    expect(result.firm.seoAuthority).toBe(30);
    // Fully measured: 100 ÷ 200 = 50.
    expect(result.firm.visibilityPercent).toBe(50);
    expect(result.firm.provenance).toEqual(FULL_PROV);
  });

  it("missing provenance shrinks the denominator — never an earned zero", async () => {
    // seoAuthority missing: measured = 100-30 = 70 of 200-60 = 140 → 50%.
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({
        audits: [auditRow({ provenance: { ...FULL_PROV, seoAuthority: "missing" } })],
      }),
    }));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.firm) return;
    expect(result.firm.visibilityPercent).toBe(50);
    expect(result.firm.provenance.seoAuthority).toBe("missing");
  });

  it("an audit row with no provenance object at all treats every category as missing", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({ audits: [auditRow({ provenance: undefined })] }),
    }));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.firm) return;
    expect(result.firm.provenance.seoAuthority).toBe("missing");
    // Nothing measured → no denominator → 0, not a fabricated percent.
    expect(result.firm.visibilityPercent).toBe(0);
  });

  it("peers null → single-entry fallback leaderboard at rank 1", async () => {
    const result = await loadSignedInData("user-1", "token", sources({}));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.leaderboard) return;
    expect(result.leaderboard).toHaveLength(1);
    expect(result.leaderboard[0].rank).toBe(1);
    expect(result.leaderboard[0].isYou).toBe(true);
  });

  it("a throwing peer source degrades to the fallback, never fails the load", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      fetchPeers: async () => { throw new Error("peers exploded"); },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.leaderboard) return;
    expect(result.leaderboard).toHaveLength(1);
    expect(result.leaderboard[0].rank).toBe(1);
  });

  it("peers present → firm rank syncs to the market-list position", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      fetchPeers: async (_market, _domain, liveFirm) => [{ ...liveFirm, rank: 4 }],
    }));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.firm || !result.leaderboard) return;
    expect(result.firm.rank).toBe(4);
    // The real percentile lands on the isYou entry, never overwriting rank.
    expect(result.leaderboard[0].percentile).toBe(20);
  });

  it("history rows map through with their frozen evidence fields", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({ audits: [auditRow()], history: [historyRow()] }),
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.auditHistory).toHaveLength(1);
    expect(result.auditHistory[0]).toEqual({
      score: 95,
      recordedAt: "2026-07-15T10:00:00Z",
      rawMetrics: { pagespeed: 72 },
      provenance: FULL_PROV,
      confidenceScore: 0.8,
      sampleSize: 12,
    });
  });
});

// ─── Score tab: SEO & Authority category row ──────────────────────────────────
//
// These tests exercise the full data path that the Score tab relies on:
//   loadSignedInData → firm.seoAuthority + firm.provenance.seoAuthority
//   → getCategories(firm) → CategoryRow's isMissing branch
//   → computeMeasuredTotals → partialNote in index.tsx
//
// They confirm that a signed-in audit with a measured seo_authority_score
// (provenance.seoAuthority = "api") produces a non-missing SEO & Authority
// row and an absent partialNote.

describe("Score tab SEO & Authority category row", () => {
  // Helper: derive the Score tab's partialNote string from a categories array,
  // mirroring the exact logic in app/(tabs)/index.tsx.
  function scoreTabPartialNote(categories: ReturnType<typeof getCategories>): string | null {
    const measured = computeMeasuredTotals(categories);
    const measuredCount = categories.filter((c) => c.provenance !== "missing").length;
    return measured.isPartial
      ? `*Scored on ${measuredCount} of ${categories.length} categories — ${measured.excludedLabels.join(", ")} is awaiting its data source, so it's excluded from your total rather than guessed at zero.`
      : null;
  }

  it("seo_authority_score=30 with provenance.seoAuthority='api' maps to a non-missing SEO category", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({
        audits: [auditRow({ seo_authority_score: 30, provenance: FULL_PROV })],
        history: [],
      }),
    }));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.firm) return;

    const categories = getCategories(result.firm);
    const seoCat = categories.find((c) => c.key === "seoAuthority");

    expect(seoCat).toBeDefined();
    // CategoryRow renders "Not measured" only when provenance === 'missing'.
    expect(seoCat!.provenance).not.toBe("missing");
    expect(seoCat!.provenance).toBe("api");
    // Score must carry the raw value from the audit row.
    expect(seoCat!.score).toBe(30);
    expect(seoCat!.label).toBe("SEO & Authority");
  });

  it("all categories measured → isPartial is false and partialNote is absent", async () => {
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({
        audits: [auditRow({ provenance: FULL_PROV })],
        history: [],
      }),
    }));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.firm) return;

    const categories = getCategories(result.firm);
    const measured = computeMeasuredTotals(categories);

    expect(measured.isPartial).toBe(false);
    expect(measured.excludedLabels).toHaveLength(0);
    // Score tab renders partialNote only when measured.isPartial — must be null.
    expect(scoreTabPartialNote(categories)).toBeNull();
  });

  it("SEO measured after previously being the only missing category → partialNote is absent", async () => {
    // Simulates a second audit where seoAuthority was previously missing but
    // is now measured; the Score tab must not show the partial-score note.
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({
        audits: [auditRow({
          seo_authority_score: 30,
          provenance: { ...FULL_PROV, seoAuthority: "api" },
        })],
        history: [],
      }),
    }));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.firm) return;

    const categories = getCategories(result.firm);
    expect(scoreTabPartialNote(categories)).toBeNull();
  });

  it("SEO still missing → partialNote names SEO & Authority as excluded", async () => {
    // Confirms the contrast case: when seoAuthority IS missing, partialNote IS
    // present and mentions the category — so the absence test above is
    // meaningful, not trivially passing because partialNote is always null.
    const result = await loadSignedInData("user-1", "token", sources({
      callAuditGet: async () => ({
        audits: [auditRow({ provenance: { ...FULL_PROV, seoAuthority: "missing" } })],
        history: [],
      }),
    }));
    expect(result.ok).toBe(true);
    if (!result.ok || !result.firm) return;

    const categories = getCategories(result.firm);
    const note = scoreTabPartialNote(categories);

    expect(note).not.toBeNull();
    expect(note).toContain("SEO & Authority");

    const seoCat = categories.find((c) => c.key === "seoAuthority");
    expect(seoCat!.provenance).toBe("missing");
  });
});
