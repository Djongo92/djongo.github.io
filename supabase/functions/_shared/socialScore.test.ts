import { describe, it, expect } from "vitest";
import { computeSocialScore } from "./socialScore";

// Thenable builder mirroring supabase-js's PostgrestFilterBuilder — `.eq()`
// chains any number of times, and the builder itself resolves when awaited,
// so it works whether peerStatsFor scopes to the peer group or widens to
// the whole market.
function makeMockClient(rows: { raw_metrics: Record<string, unknown> }[] = []) {
  return {
    from: () => ({
      select: () => {
        const builder = {
          eq: () => builder,
          neq: () => builder,
          then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
        };
        return builder;
      },
    }),
  } as any;
}

describe("computeSocialScore", () => {
  it("returns missing provenance and score 0 when no input was submitted", async () => {
    const client = makeMockClient();
    const result = await computeSocialScore(client, "serbia", "regional", null, "example.com");
    expect(result.score).toBe(0);
    expect(result.provenance).toBe("missing");
  });

  it("scores self-reported input as self_reported provenance", async () => {
    const client = makeMockClient();
    const input = { followers: 500, posts30d: 4, platforms: { linkedin: true, instagram: false, twitter: false, facebook: false } };
    const result = await computeSocialScore(client, "serbia", "regional", input, "example.com");
    expect(result.provenance).toBe("self_reported");
    expect(result.score).toBeGreaterThan(0);
  });

  it("clamps an absurd followers value rather than letting it poison the live peer-max", async () => {
    const client = makeMockClient();
    const input = { followers: 999_999_999, posts30d: 0, platforms: { linkedin: false, instagram: false, twitter: false, facebook: false } };
    const result = await computeSocialScore(client, "serbia", "regional", input, "example.com");
    expect((result.raw as { followers: number }).followers).toBe(2_000_000);
  });

  it("never exceeds the 20-point ceiling", async () => {
    const client = makeMockClient();
    const input = {
      followers: 10_000_000, posts30d: 10_000, engagementRate: 500,
      platforms: { linkedin: true, instagram: true, twitter: true, facebook: true },
    };
    const result = await computeSocialScore(client, "serbia", "regional", input, "example.com");
    expect(result.score).toBeLessThanOrEqual(20);
  });
});
