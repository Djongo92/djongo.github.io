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
  });

  it("caps the count/N breadth component at 10, even beyond N", () => {
    const manyTables = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`T${i}`, 1]));
    const result = directoryScore(manyTables, 7, 4, [4]);
    expect(result.points).toBeLessThanOrEqual(15); // 10 (count cap) + 5 (quality cap)
  });

  it("gives a firm at the peer-group's best quality the full 5-point quality bonus", () => {
    // Ranked #1 in a single table (count=1 of N=7), and it IS the peer max.
    const result = directoryScore({ BF: 1 }, 7, 4, [4]);
    expect(result.points).toBeCloseTo(10 * (1 / 7) + 5, 5);
  });

  it("never divides by zero when every peer (including self) has no ranked tables", () => {
    const result = directoryScore(undefined, 7, 4, [0, 0]);
    expect(Number.isFinite(result.points)).toBe(true);
  });
});

function makeMockClient(directoryRows: DirectoryRow[], opts: { queryError?: boolean } = {}) {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  const client = {
    from(table: string) {
      if (table === "market_directory_data") {
        return { select: () => ({ eq: () => Promise.resolve(opts.queryError ? { data: null, error: new Error("boom") } : { data: directoryRows, error: null }) }) };
      }
      if (table === "directory_lookup_requests") {
        return { insert };
      }
      throw new Error(`Unexpected table in mock: ${table}`);
    },
  };
  return { client: client as any, insert };
}

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
});
