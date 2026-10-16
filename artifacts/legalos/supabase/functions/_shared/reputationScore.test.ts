import { describe, it, expect, vi } from "vitest";
import { fuzzyMatchFirm, directoryScore, invertedAvgFor, computeReputationScore, type DirectoryRow } from "./reputationScore";

const row = (overrides: Partial<DirectoryRow>): DirectoryRow => ({
  firm_name: "Example Firm",
  firm_domain: null,
  firm_type: "L",
  chambers: { rankedTables: {} },
  legal500: { rankedTables: {} },
  iflr1000: { rankedTables: {} },
  ...overrides,
});

describe("fuzzyMatchFirm", () => {
  const rows = [
    row({ firm_name: "Schoenherr (Moravčević Vojnović and Partners)" }),
    row({ firm_name: "Karanović & Partners" }),
    row({ firm_name: "BDK Advokati" }),
  ];

  it("matches exactly on the primary name, diacritics and all", () => {
    expect(fuzzyMatchFirm("Karanović & Partners", rows)?.firm_name).toBe("Karanović & Partners");
  });

  it("matches ignoring diacritics (ASCII-transliterated input)", () => {
    expect(fuzzyMatchFirm("Karanovic & Partners", rows)?.firm_name).toBe("Karanović & Partners");
  });

  it("matches on the parenthetical alias", () => {
    expect(fuzzyMatchFirm("Moravčević Vojnović and Partners", rows)?.firm_name).toContain("Schoenherr");
  });

  it("matches a substring of the primary name", () => {
    expect(fuzzyMatchFirm("BDK", rows)?.firm_name).toBe("BDK Advokati");
  });

  it("returns null for an empty query", () => {
    expect(fuzzyMatchFirm("", rows)).toBeNull();
  });

  it("returns null when nothing plausible matches", () => {
    expect(fuzzyMatchFirm("Totally Unrelated Consultancy Group Ltd", rows)).toBeNull();
  });
});

describe("invertedAvgFor", () => {
  it("returns 0 for a firm with no ranked tables", () => {
    expect(invertedAvgFor({}, 4)).toBe(0);
    expect(invertedAvgFor(undefined, 4)).toBe(0);
  });

  it("inverts rank 1 (best) to the highest possible value", () => {
    expect(invertedAvgFor({ BF: 1 }, 4)).toBe(4);
  });

  it("inverts the worst rank to 1", () => {
    expect(invertedAvgFor({ BF: 4 }, 4)).toBe(1);
  });

  it("averages across multiple tables", () => {
    expect(invertedAvgFor({ BF: 1, CC: 4 }, 4)).toBe(2.5); // avgRank=2.5, deepest+1-avg = 5-2.5
  });
});

describe("directoryScore", () => {
  it("scores 0 with no ranked tables", () => {
    const result = directoryScore(undefined, 7, 4, []);
    expect(result.points).toBe(0);
    expect(result.count).toBe(0);
    expect(result.qualityStats).toBeNull();
  });

  it("caps the count/N breadth component at 10, even beyond N", () => {
    const manyTables = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`T${i}`, 1]));
    const result = directoryScore(manyTables, 7, 4, [4]);
    expect(result.points).toBeLessThanOrEqual(15); // 10 (count cap) + 5 (quality cap)
  });

  it("gives a firm at the peer group's 90th percentile the full 5-point quality bonus", () => {
    // Ranked #1 in a single table (count=1 of N=7), and it's at the top of a
    // 2-value comparison set (itself + one peer at the same inverted average).
    const result = directoryScore({ BF: 1 }, 7, 4, [4]);
    expect(result.points).toBeCloseTo(10 * (1 / 7) + 5, 5);
    expect(result.qualityStats?.p90Threshold).toBe(4);
  });

  it("never divides by zero when every peer (including self) has no ranked tables", () => {
    const result = directoryScore(undefined, 7, 4, [0, 0]);
    expect(Number.isFinite(result.points)).toBe(true);
  });

  it("a single dominant peer no longer crushes everyone else's quality score", () => {
    // One peer with a perfect inverted average of 4, several solid-but-not-
    // perfect peers at 2. Under the old divide-by-max approach, a firm at 2
    // would score 5 * 2/4 = 2.5. Under p90 benchmarking, the 90th percentile
    // of a set dominated by 2s is much closer to 2, so the same firm scores
    // close to full marks instead of being crushed by the one outlier.
    const peers = [4, 2, 2, 2, 2, 2, 2, 2];
    const result = directoryScore({ BF: 2 }, 7, 4, peers); // avgRank=2, invertedAvg=3
    const oldWayQuality = 5 * (3 / 4);
    expect(result.points - (10 * (1 / 7))).toBeGreaterThan(oldWayQuality);
  });

  it("flags low confidence and passes through the widened flag when the sample is small", () => {
    const result = directoryScore({ BF: 1 }, 7, 4, [], true);
    expect(result.qualityStats?.widened).toBe(true);
    expect(result.qualityStats?.lowConfidence).toBe(true); // only 1 value in the comparison set
  });
});

type FirmSignalMock = { payload: Record<string, unknown>; is_unverifiable: boolean } | null;

function makeMockClient(
  directoryRows: DirectoryRow[],
  opts: {
    queryError?: boolean;
    /** When set, firm_signals returns this row instead of null */
    firmSignal?: FirmSignalMock;
  } = {},
) {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  const client = {
    from(table: string) {
      if (table === "market_directory_data") {
        return { select: () => ({ eq: () => Promise.resolve(opts.queryError ? { data: null, error: new Error("boom") } : { data: directoryRows, error: null }) }) };
      }
      if (table === "directory_lookup_requests") {
        return { insert };
      }
      if (table === "firm_signals") {
        // Return a fluent chain that resolves to the signal via maybeSingle()
        const chain = { eq: () => chain, gt: () => chain, maybeSingle: () => Promise.resolve({ data: opts.firmSignal ?? null, error: null }) };
        return { select: () => chain };
      }
      throw new Error(`Unexpected table in mock: ${table}`);
    },
  };
  return { client: client as any, insert };
}

/** A realistic Google Places signal with a 4.6-star / 28-review listing. */
const placesSignal: FirmSignalMock = {
  is_unverifiable: false,
  payload: {
    details: {
      placeId: "ChIJabc123",
      businessStatus: "OPERATIONAL",
      rating: 4.6,
      reviewCount: 28,
      hasWebsite: true,
      hasPhone: true,
      hasHours: false,
      hasPhotos: false,
    },
  },
};

describe("computeReputationScore", () => {
  it("scores GBP only for an unsupported market", async () => {
    const { client } = makeMockClient([]);
    const result = await computeReputationScore(client, "narnia", "example.com", true);
    expect(result.score).toBe(10);
    expect(result.directory).toBe("pending");
    expect(result.provenance).toBe("missing");
  });

  it("scores GBP only and degrades gracefully when the directory query errors", async () => {
    const { client } = makeMockClient([], { queryError: true });
    const result = await computeReputationScore(client, "serbia", "example.com", true);
    expect(result.score).toBe(10);
    expect(result.directory).toBe("pending");
  });

  it("queues a lookup request and scores GBP only on a directory miss", async () => {
    const { client, insert } = makeMockClient([row({ firm_name: "Totally Different Firm" })]);
    const result = await computeReputationScore(client, "serbia", "Nonexistent Law LLC", false);
    expect(result.score).toBe(0);
    expect(result.directory).toBe("pending");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ market: "serbia", firm_domain_or_name: "Nonexistent Law LLC" }));
  });

  it("scores the matched firm plus GBP on a directory hit", async () => {
    const { client } = makeMockClient([row({ firm_name: "Karanović & Partners", firm_type: "R", chambers: { rankedTables: { BF: 1 } }, legal500: { rankedTables: { BF: 1 } } })]);
    const result = await computeReputationScore(client, "serbia", "Karanovic & Partners", true);
    expect(result.directory).toBe("matched");
    expect(result.provenance).toBe("api");
    expect(result.score).toBeGreaterThan(10); // more than just the GBP points
    expect(result.score).toBeLessThanOrEqual(55);
  });

  it("matches on firm_domain first — audits arrive with domains that never fuzzy-match a firm name", async () => {
    const { client } = makeMockClient([row({ firm_name: "BDK Advokati AOD", firm_domain: "www.bdkadvokati.com", firm_type: "L", chambers: { rankedTables: { GC: 2 } } })]);
    const result = await computeReputationScore(client, "serbia", "bdkadvokati.com", true);
    expect(result.directory).toBe("matched");
    expect(result.provenance).toBe("api");
    expect(result.score).toBeGreaterThan(10); // more than just the GBP points
  });

  // --- GBP raw fields on every exit path ---
  // The UI renders the GBP sub-score breakdown from these fields, so a key
  // missing on any early-return path reads as "0 pts" / legacy "Listed /
  // Not listed" even when Places returned a rich score. Every exit must
  // carry the full set.

  /** Asserts the complete GBP field set, not just the two legacy keys. */
  const expectFullGbpRaw = (raw: Record<string, unknown>, expected: {
    gbpListed: boolean;
    gbpScore: number;
    gbpSource: "google_places_api" | "self_reported";
    gbpRating: number | null;
    gbpReviewCount: number | null;
    gbpOperational: boolean | null;
    gbpScoreBreakdown: unknown;
  }) => {
    expect(raw.gbpListed).toBe(expected.gbpListed);
    expect(raw.gbpScore).toBe(expected.gbpScore);
    expect(raw.gbpSource).toBe(expected.gbpSource);
    expect(raw.gbpRating).toBe(expected.gbpRating);
    expect(raw.gbpReviewCount).toBe(expected.gbpReviewCount);
    expect(raw.gbpOperational).toBe(expected.gbpOperational);
    expect(raw.gbpScoreBreakdown).toEqual(expected.gbpScoreBreakdown);
  };

  // calculateGbpScore on the placesSignal fixture: operational 2 +
  // rating 2.5 (4.6 ≥ 4.5) + reviews 2 (28 ≥ 25) + completeness 1
  // (website + phone, no hours/photos) = 7.5.
  const placesGbpRaw = {
    gbpSource: "google_places_api" as const,
    gbpScore: 7.5,
    gbpRating: 4.6,
    gbpReviewCount: 28,
    gbpOperational: true,
    gbpScoreBreakdown: { operationalPts: 2, ratingPts: 2.5, reviewPts: 2, completenessPts: 1 },
  };

  /** Self-reported fallback carries the field set with null detail values. */
  const selfReportedGbpRaw = (gbpListed: boolean) => ({
    gbpListed,
    gbpScore: gbpListed ? 10 : 0,
    gbpSource: "self_reported" as const,
    gbpRating: null,
    gbpReviewCount: null,
    gbpOperational: null,
    gbpScoreBreakdown: null,
  });

  it("includes the full GBP field set in raw when market is unsupported (self-reported)", async () => {
    const { client } = makeMockClient([]);
    const result = await computeReputationScore(client, "narnia", "example.com", true);
    expectFullGbpRaw(result.raw, selfReportedGbpRaw(true));
  });

  it("includes the full GBP field set in raw when the directory query errors (self-reported)", async () => {
    const { client } = makeMockClient([], { queryError: true });
    const result = await computeReputationScore(client, "serbia", "example.com", false);
    expectFullGbpRaw(result.raw, selfReportedGbpRaw(false));
  });

  it("includes the full GBP field set in raw on a directory miss (self-reported)", async () => {
    const { client } = makeMockClient([row({ firm_name: "Totally Different Firm" })]);
    const result = await computeReputationScore(client, "serbia", "Nonexistent Law LLC", false);
    expectFullGbpRaw(result.raw, selfReportedGbpRaw(false));
  });

  it("includes Places-derived fields in raw on an unsupported-market exit", async () => {
    const { client } = makeMockClient([], { firmSignal: placesSignal });
    const result = await computeReputationScore(client, "narnia", "example.com", true);
    expectFullGbpRaw(result.raw, { gbpListed: true, ...placesGbpRaw });
    expect(result.score).toBe(7.5);
  });

  it("includes Places-derived fields in raw when the directory query errors", async () => {
    const { client } = makeMockClient([], { queryError: true, firmSignal: placesSignal });
    const result = await computeReputationScore(client, "serbia", "example.com", true);
    expectFullGbpRaw(result.raw, { gbpListed: true, ...placesGbpRaw });
    expect(result.score).toBe(7.5);
  });

  it("includes Places-derived fields in raw on a no-directory-match exit", async () => {
    const { client } = makeMockClient([row({ firm_name: "Totally Different Firm" })], { firmSignal: placesSignal });
    const result = await computeReputationScore(client, "serbia", "Nonexistent Law LLC", false);
    expectFullGbpRaw(result.raw, { gbpListed: false, ...placesGbpRaw });
    // The persisted score reflects the live Places score, not the boolean fallback
    expect(result.score).toBe(7.5);
  });
});
