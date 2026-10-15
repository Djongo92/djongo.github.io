import { describe, it, expect } from "vitest";
import {
  performanceTrendMetric,
  socialTrendMetric,
  seoTrendMetric,
  thoughtLeadershipTrendMetric,
  reputationTrendMetric,
  formatThoughtLeadershipInputs,
  CATEGORY_TREND_METRIC,
  historyEvidenceLine,
} from "./visibilityInputFormatters";
import { CATEGORY_META, PROVENANCE_META } from "./visibilityCategories";

// Short "raw metric next to the normalized point" headlines for the
// score-history chart tooltip — see task #39. These take ONE category's raw
// sub-object (e.g. raw_metrics.social on a history row), not the whole
// raw_metrics record, and must return null rather than a fabricated number
// when that category's inputs weren't recorded on a given snapshot.

describe("performanceTrendMetric", () => {
  it("returns the PageSpeed average when both desktop and mobile are present", () => {
    expect(performanceTrendMetric({ desktop: { performance: 62 }, mobile: { performance: 96 }, perfAvg: 79 })).toBe("79 PageSpeed avg");
  });

  it("derives the average when perfAvg wasn't stored", () => {
    expect(performanceTrendMetric({ desktop: { performance: 60 }, mobile: { performance: 80 } })).toBe("70 PageSpeed avg");
  });

  it("returns null when performance was never scored on that snapshot", () => {
    expect(performanceTrendMetric(undefined)).toBeNull();
    expect(performanceTrendMetric({})).toBeNull();
  });
});

describe("socialTrendMetric", () => {
  it("formats the follower count", () => {
    expect(socialTrendMetric({ followers: 1234 })).toBe("1,234 followers");
  });

  it("returns null when no social self-report was recorded", () => {
    expect(socialTrendMetric(undefined)).toBeNull();
    expect(socialTrendMetric({})).toBeNull();
  });
});

describe("seoTrendMetric", () => {
  it("always returns null — SEO & Authority isn't configured in this build", () => {
    expect(seoTrendMetric({ domainAuthority: { value: 40 } })).toBeNull();
  });
});

describe("thoughtLeadershipTrendMetric", () => {
  it("formats the post count, singular vs. plural", () => {
    expect(thoughtLeadershipTrendMetric({ postsCount: 14 })).toBe("14 posts");
    expect(thoughtLeadershipTrendMetric({ postsCount: 1 })).toBe("1 post");
    expect(thoughtLeadershipTrendMetric({ postsCount: 0 })).toBe("0 posts");
  });

  it("returns null when thought leadership was never scored on that snapshot", () => {
    expect(thoughtLeadershipTrendMetric(undefined)).toBeNull();
  });
});

describe("Thought Leadership explanation evidence", () => {
  it("keeps the calculation copy aligned with the measured inputs and benchmark", () => {
    const explanation = formatThoughtLeadershipInputs({
      thoughtLeadership: {
        postsCount: 10,
        articlesCount: 8,
        ownNewsCount: 2,
        bylinePct: 0.75,
        newsCount: 2,
        activeMonths: 3,
        windowMonths: 3,
        articlesStats: { p90Threshold: 12, sampleSize: 9, lowConfidence: false },
      },
    });

    expect(explanation).toContain("8 articles on your own site");
    expect(explanation).toContain("2 firm news items on your own site");
    expect(explanation).toContain("75% carry a named byline");
    expect(explanation).toContain("published in 3 of the last 3 months");
    expect(explanation).toContain("2 press mentions found via Google News");
    expect(explanation).toContain("90th percentile (12) among 9 similar firms");
    expect(CATEGORY_META.thoughtLeadership.how).toContain("60 pts articles");
    expect(CATEGORY_META.thoughtLeadership.how).toContain("20 pts share signed by a named lawyer");
    expect(CATEGORY_META.thoughtLeadership.how).toContain("30 pts independent press coverage");
    expect(PROVENANCE_META.ai_classified.description).toContain("read your site's content");
  });

  it("does not invent an input summary when a category was not measured", () => {
    expect(formatThoughtLeadershipInputs({})).toBeNull();
  });
});

describe("reputationTrendMetric", () => {
  it("prefers the verified Google Places rating when available", () => {
    expect(reputationTrendMetric({ gbpRating: 4.6, gbpListed: true })).toBe("★ 4.6 GBP");
  });

  it("falls back to directory table breadth when there's no GBP rating", () => {
    expect(reputationTrendMetric({ chambers: { count: 2 }, legal500: { count: 1 } })).toBe("3 ranked tables");
  });

  it("falls back to the self-reported GBP boolean when nothing else is available", () => {
    expect(reputationTrendMetric({ gbpListed: true })).toBe("GBP listed");
    expect(reputationTrendMetric({ gbpListed: false })).toBeNull();
  });

  it("returns null when reputation was never scored on that snapshot", () => {
    expect(reputationTrendMetric(undefined)).toBeNull();
  });
});

describe("CATEGORY_TREND_METRIC", () => {
  it("a missing high-value category's stored raw sub-object doesn't get fabricated into a headline just because the key exists", () => {
    // e.g. a history row where thoughtLeadership.raw was stored as the
    // "missing" shell ({ postsCount: 0, ... }) from an early run before
    // ANTHROPIC_API_KEY was configured — the trend metric itself can't tell
    // this apart from a real zero; that's why Analytics.tsx additionally
    // gates on provenance before ever calling this function.
    expect(CATEGORY_TREND_METRIC.thoughtLeadership({ postsCount: 0, newsCount: 0, bylinePct: 0 })).toBe("0 posts");
  });

  it("covers every category key", () => {
    expect(Object.keys(CATEGORY_TREND_METRIC).sort()).toEqual(
      ["performance", "reputation", "seoAuthority", "social", "thoughtLeadership"].sort(),
    );
  });
});

describe("historyEvidenceLine (exports' per-point evidence)", () => {
  const raw = {
    performance: { desktop: { performance: 70 }, mobile: { performance: 60 }, perfAvg: 65 },
    social: { followers: 1850 },
    thoughtLeadership: { postsCount: 2 },
    reputation: { gbpRating: 4.6 },
  };
  const fullProvenance = {
    performance: "api", social: "api", seoAuthority: "api", thoughtLeadership: "api", reputation: "api",
  };

  it("joins every measured category with the chart's separator", () => {
    expect(historyEvidenceLine(raw, fullProvenance))
      .toBe("65 PageSpeed avg · 1,850 followers · 2 posts · ★ 4.6 GBP");
  });

  it("omits a category whose frozen provenance is \"missing\" — never a fabricated raw value", () => {
    const line = historyEvidenceLine(raw, { ...fullProvenance, social: "missing" });
    expect(line).not.toContain("followers");
    expect(line).toContain("65 PageSpeed avg");
  });

  it("treats absent provenance (older history rows) as missing rather than assumed measured", () => {
    expect(historyEvidenceLine(raw, null)).toBeNull();
    expect(historyEvidenceLine(raw, { social: "api" })).toBe("1,850 followers");
  });

  it("returns null when rawMetrics is absent (rows predating the freeze)", () => {
    expect(historyEvidenceLine(null, fullProvenance)).toBeNull();
    expect(historyEvidenceLine(undefined, fullProvenance)).toBeNull();
  });
});
