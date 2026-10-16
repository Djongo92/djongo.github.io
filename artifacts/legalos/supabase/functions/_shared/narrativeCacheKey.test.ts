import { describe, it, expect } from "vitest";
import { buildNarrativeCacheKey } from "./narrativeCacheKey";

const base = {
  domain: "firm.rs",
  market: "serbia",
  peerGroup: "full_service",
  scaledTotal: 370,
  measuredMax: 200,
  clientId: "anon",
  siteHealthIssues: [] as string[],
};
// Same scaled total, different distribution — the exact stale-cache defect.
const catsA = {
  performance: { score: 14, max: 20, provenance: "api" },
  social: { score: 9, max: 20, provenance: "api" },
};
const catsB = {
  performance: { score: 9, max: 20, provenance: "api" },
  social: { score: 14, max: 20, provenance: "api" },
};

describe("buildNarrativeCacheKey", () => {
  it("is stable for identical inputs", () => {
    expect(buildNarrativeCacheKey({ ...base, categories: catsA })).toBe(
      buildNarrativeCacheKey({ ...base, categories: { ...catsA } })
    );
  });

  it("differs when the same total comes from a different category distribution", () => {
    expect(buildNarrativeCacheKey({ ...base, categories: catsA })).not.toBe(
      buildNarrativeCacheKey({ ...base, categories: catsB })
    );
  });

  it("differs when site-health flags change", () => {
    expect(buildNarrativeCacheKey({ ...base, categories: catsA })).not.toBe(
      buildNarrativeCacheKey({ ...base, categories: catsA, siteHealthIssues: ["stale copyright year"] })
    );
  });

  it("differs when provenance changes at identical scores", () => {
    const catsMissing = { ...catsA, social: { score: 9, max: 20, provenance: "missing" } };
    expect(buildNarrativeCacheKey({ ...base, categories: catsA })).not.toBe(
      buildNarrativeCacheKey({ ...base, categories: catsMissing })
    );
  });
});
