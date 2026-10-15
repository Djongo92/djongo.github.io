import { describe, it, expect } from "vitest";
import { computeSocialScore, parseSocialIntake } from "./socialScore";

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

  it("detected presence scores platforms only and persists no numeric metrics the peer pool could read", async () => {
    // A throwing client proves the detected path never touches the DB —
    // peerStatsFor reads raw_metrics numerics from published audits, so a
    // detected audit must not contribute follower/post/engagement values.
    const client = { from: () => { throw new Error("detected path must not query the DB"); } } as any;
    const result = await computeSocialScore(
      client, "serbia", "regional",
      { followers: 0, posts30d: 0, platforms: { linkedin: true, instagram: false, twitter: false, facebook: true } },
      "example.com", null, "detected",
    );
    expect(result.provenance).toBe("detected");
    expect(result.score).toBe(7.5); // linkedin + facebook presence only: 2 of 4 platforms × 15
    expect(result.raw).not.toHaveProperty("followers");
    expect(result.raw).not.toHaveProperty("posts30d");
    expect(result.raw).not.toHaveProperty("engagementRate");
  });

  it("scores self-reported input as self_reported provenance", async () => {
    const client = makeMockClient();
    const input = { followers: 500, posts30d: 4, platforms: { linkedin: true, instagram: false, twitter: false, facebook: false } };
    const result = await computeSocialScore(client, "serbia", "regional", input, "example.com");
    expect(result.provenance).toBe("self_reported");
    expect(result.score).toBeGreaterThan(0);
  });

  it("directory numerics get full numeric scoring but are labeled directory, not self-reported", async () => {
    const client = makeMockClient();
    const input = { followers: 680, posts30d: 3, platforms: { linkedin: true, instagram: false, twitter: false, facebook: false } };
    const result = await computeSocialScore(client, "serbia", "regional", input, "naumovic-partners.com", null, "directory");
    expect(result.provenance).toBe("directory");
    // Real numerics must persist (unlike the detected path) — the peer pool
    // is allowed to read researcher-verified values.
    expect(result.raw).toHaveProperty("followers", 680);
    expect(result.raw).toHaveProperty("posts30d", 3);
    expect(result.raw).toHaveProperty("followersStats");
    expect(result.score).toBeGreaterThan(0);
  });

  it("clamps an absurd followers value rather than letting it poison the live peer-max", async () => {
    const client = makeMockClient();
    const input = { followers: 999_999_999, posts30d: 0, platforms: { linkedin: false, instagram: false, twitter: false, facebook: false } };
    const result = await computeSocialScore(client, "serbia", "regional", input, "example.com");
    expect((result.raw as { followers: number }).followers).toBe(2_000_000);
  });

  it("never exceeds the 75-point ceiling", async () => {
    const client = makeMockClient();
    const input = {
      followers: 10_000_000, posts30d: 10_000, engagementRate: 500,
      platforms: { linkedin: true, instagram: true, twitter: true, facebook: true },
    };
    const result = await computeSocialScore(client, "serbia", "regional", input, "example.com");
    expect(result.score).toBeLessThanOrEqual(75);
  });
});

describe("parseSocialIntake", () => {
  it("treats blank or platform-only submissions as no intake, so directory research wins over a bare form object", () => {
    expect(parseSocialIntake({})).toBeNull();
    expect(parseSocialIntake(null)).toBeNull();
    expect(parseSocialIntake(undefined)).toBeNull();
    expect(parseSocialIntake("680")).toBeNull();
    expect(parseSocialIntake({ platforms: { linkedin: true } })).toBeNull();
    expect(parseSocialIntake({ followers: "", posts30d: null })).toBeNull();
  });

  it("rejects values Number() would coerce — whitespace, booleans, arrays, objects", () => {
    expect(parseSocialIntake({ followers: " ", posts30d: " " })).toBeNull();
    expect(parseSocialIntake({ followers: true })).toBeNull();
    expect(parseSocialIntake({ followers: [] })).toBeNull();
    expect(parseSocialIntake({ followers: {} })).toBeNull();
    expect(parseSocialIntake({ followers: "abc" })).toBeNull();
  });

  it("accepts a submission with at least one real numeric, defaulting the blank field to 0", () => {
    const input = parseSocialIntake({ followers: " ", posts30d: "3" });
    expect(input).not.toBeNull();
    expect(input?.followers).toBe(0);
    expect(input?.posts30d).toBe(3);
  });

  it("accepts explicit zeros as a real self-report when numeric fields are submitted", () => {
    const input = parseSocialIntake({ followers: 0, posts30d: 0, platforms: { linkedin: false, instagram: false, twitter: false, facebook: false } });
    expect(input).not.toBeNull();
    expect(input?.followers).toBe(0);
    expect(input?.posts30d).toBe(0);
  });

  it("accepts numeric strings from form payloads", () => {
    const input = parseSocialIntake({ followers: "680", posts30d: "3" });
    expect(input?.followers).toBe(680);
    expect(input?.posts30d).toBe(3);
  });
});
