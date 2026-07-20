import { describe, it, expect } from "vitest";
import { computeSocialScore } from "./socialScore";

function makeMockClient(rows: { raw_metrics: Record<string, unknown> }[] = []) {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: rows, error: null }) }) }) }),
    }),
  } as any;
}

describe("computeSocialScore", () => {
  it("returns missing provenance and score 0 when no input was submitted", async () => {
    const client = makeMockClient();
    const result = await computeSocialScore(client, "serbia", "regional", null);
    expect(result.score).toBe(0);
    expect(result.provenance).toBe("missing");
  });

  it("scores self-reported input as self_reported provenance", async () => {
    const client = makeMockClient();
    const input = { followers: 500, posts30d: 4, platforms: { linkedin: true, instagram: false, twitter: false, facebook: false } };
    const result = await computeSocialScore(client, "serbia", "regional", input);
    expect(result.provenance).toBe("self_reported");
    expect(result.score).toBeGreaterThan(0);
  });

  it("clamps an absurd followers value rather than letting it poison the live peer-max", async () => {
    const client = makeMockClient();
    const input = { followers: 999_999_999, posts30d: 0, platforms: { linkedin: false, instagram: false, twitter: false, facebook: false } };
    const result = await computeSocialScore(client, "serbia", "regional", input);
    expect((result.raw as { followers: number }).followers).toBe(2_000_000);
  });

  it("never exceeds the 20-point ceiling", async () => {
    const client = makeMockClient();
    const input = {
      followers: 10_000_000, posts30d: 10_000, engagementRate: 500,
      platforms: { linkedin: true, instagram: true, twitter: true, facebook: true },
    };
    const result = await computeSocialScore(client, "serbia", "regional", input);
    expect(result.score).toBeLessThanOrEqual(20);
  });
});
