import { describe, it, expect, vi } from "vitest";

// The real module builds a Supabase client on import, which touches
// AsyncStorage/window — unavailable in the node test environment. These
// tests only exercise injected sources, so stub the module out entirely.
vi.mock("@/lib/supabase", () => ({
  supabase: {},
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
}));

import { applyPeerResult, fetchPeerLeaderboard } from "./peerLeaderboard";
import type { PeerSources } from "./peerLeaderboard";
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

function auditRow(id: string, domain: string, perCategory: number): PeerAuditRow {
  return {
    id,
    audited_domain: domain,
    display_name: null,
    total_score: perCategory * 5,
    performance_score: perCategory,
    social_score: perCategory,
    seo_authority_score: perCategory,
    thought_leadership_score: perCategory,
    reputation_score: perCategory,
    provenance: FULL_PROV,
  };
}

/** Fully-measured live firm: visibilityPercent = score ÷ 200. */
function liveFirm(domain: string, perCategory: number, overrides: Partial<Firm> = {}): Firm {
  const score = perCategory * 5;
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
    performance: perCategory,
    social: perCategory,
    seoAuthority: perCategory,
    thoughtLeadership: perCategory,
    reputation: perCategory,
    provenance: FULL_PROV,
    ...overrides,
  };
}

function sources(overrides: Partial<PeerSources>): PeerSources {
  return {
    queryAudits: async () => ({ data: [], error: null }),
    fetchDirectory: async () => [],
    ...overrides,
  };
}

// Silence the expected console.warn on the deliberate failure paths.
const hushWarn = () => vi.spyOn(console, "warn").mockImplementation(() => {});

// ─── fetchPeerLeaderboard ─────────────────────────────────────────────────────

describe("fetchPeerLeaderboard", () => {
  it("merges audits + directory firms, sorted, with the signed-in firm marked isYou", async () => {
    const queryAudits = vi.fn(async (_market: string) => ({
      data: [auditRow("a", "a.rs", 20), auditRow("b", "b.rs", 16)],
      error: null,
    }));
    const fetchDirectory = vi.fn(async (_market: string): Promise<DirectoryIndexFirm[]> => [
      { firmName: "DirTracked", firmDomain: "dir.rs", directoryPoints: 40 }, // 89% — ranks first
    ]);
    const live = liveFirm("b.rs", 16);

    const result = await fetchPeerLeaderboard("serbia", "b.rs", live, sources({ queryAudits, fetchDirectory }));

    expect(queryAudits).toHaveBeenCalledWith("serbia");
    expect(fetchDirectory).toHaveBeenCalledWith("serbia");
    expect(result).not.toBeNull();
    expect(result!.map((f) => f.name)).toEqual(["DirTracked", "a.rs", "b.rs"]);
    expect(result!.find((f) => f.domain === "b.rs")?.isYou).toBe(true);
    expect(result!.map((f) => f.rank)).toEqual([1, 2, 3]);
  });

  it("degrades to audits-only when the directory call returns null (rate limit / outage)", async () => {
    const result = await fetchPeerLeaderboard("serbia", "b.rs", liveFirm("b.rs", 16), sources({
      queryAudits: async () => ({ data: [auditRow("a", "a.rs", 20), auditRow("b", "b.rs", 16)], error: null }),
      fetchDirectory: async () => null,
    }));

    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    expect(result!.every((f) => f.hasFullAudit)).toBe(true);
  });

  it("degrades to audits-only when the directory call throws", async () => {
    const result = await fetchPeerLeaderboard("serbia", "b.rs", liveFirm("b.rs", 16), sources({
      queryAudits: async () => ({ data: [auditRow("a", "a.rs", 20), auditRow("b", "b.rs", 16)], error: null }),
      fetchDirectory: async () => { throw new Error("network down"); },
    }));

    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
  });

  it("returns null (not a throw) when the audits query errors — caller falls back", async () => {
    hushWarn();
    const result = await fetchPeerLeaderboard("serbia", "b.rs", liveFirm("b.rs", 16), sources({
      queryAudits: async () => ({ data: null, error: new Error("permission denied") }),
    }));

    expect(result).toBeNull();
  });

  it("returns null (not a throw) when the audits query itself throws", async () => {
    hushWarn();
    const result = await fetchPeerLeaderboard("serbia", "b.rs", liveFirm("b.rs", 16), sources({
      queryAudits: async () => { throw new Error("connection reset"); },
    }));

    expect(result).toBeNull();
  });

  it("still carries the signed-in firm when the market has no published audits at all", async () => {
    const live = liveFirm("solo.rs", 10);
    const result = await fetchPeerLeaderboard("serbia", "solo.rs", live, sources({}));

    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0].isYou).toBe(true);
    expect(result![0].rank).toBe(1);
  });
});

// ─── applyPeerResult ──────────────────────────────────────────────────────────

describe("applyPeerResult", () => {
  it("splices the real percentile onto the isYou entry only, never overwriting market rank", async () => {
    // Signed-in firm is market rank #2 of 4, but its peer_group percentile is
    // 99 (tiny group). The percentile must enrich, never re-rank.
    const peers = (await fetchPeerLeaderboard("serbia", "b.rs", liveFirm("b.rs", 20), sources({
      queryAudits: async () => ({
        data: [
          auditRow("a", "a.rs", 24), // 120 → rank 1
          auditRow("b", "b.rs", 20), // 100 → rank 2 (signed-in)
          auditRow("c", "c.rs", 16),
          auditRow("d", "d.rs", 12),
        ],
        error: null,
      }),
    })))!;

    const { leaderboard, firm } = applyPeerResult(peers, liveFirm("b.rs", 20), 99);

    const selfEntry = leaderboard.find((f) => f.isYou)!;
    expect(selfEntry.percentile).toBe(99); // enriched
    expect(selfEntry.rank).toBe(2); // market rank preserved — NOT percentile-derived
    // Other entries keep their placeholder percentile (0).
    expect(leaderboard.find((f) => f.domain === "a.rs")?.percentile).toBe(0);
    // firm.rank syncs to the market-list position.
    expect(firm.rank).toBe(2);
  });

  it("falls back to a single-entry list when peers is null, without throwing", () => {
    const live = liveFirm("b.rs", 16, { name: "My Firm", rank: 0 });

    const { leaderboard, firm } = applyPeerResult(null, live, 40);

    expect(leaderboard.length).toBe(1);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].name).toBe("My Firm");
    expect(leaderboard[0].isYou).toBe(true);
    expect(firm.rank).toBe(1);
    expect(firm.name).toBe("My Firm");
    expect(firm.percentile).toBe(25); // live firm's own, from the fixture
  });
});
