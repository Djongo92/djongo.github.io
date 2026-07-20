import { describe, it, expect } from "vitest";
import { filterToWindow, aggregateContentItems, calculateThoughtLeadershipScore, type ContentItem } from "./thoughtLeadershipFormula";

const NOW = new Date("2026-07-19T00:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const item = (overrides: Partial<ContentItem>): ContentItem => ({
  title: "t", date: daysAgo(0), type: "blog", hasNamedByline: false, ...overrides,
});

describe("filterToWindow", () => {
  it("keeps items within the window and drops items outside it", () => {
    const items = [item({ date: daysAgo(10) }), item({ date: daysAgo(90) })];
    const result = filterToWindow(items, 60, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe(daysAgo(10));
  });

  it("drops items with unparseable dates rather than guessing", () => {
    const items = [item({ date: "not-a-date" }), item({ date: daysAgo(5) })];
    const result = filterToWindow(items, 60, NOW);
    expect(result).toHaveLength(1);
  });

  it("includes an item exactly at the window boundary", () => {
    const items = [item({ date: daysAgo(60) })];
    const result = filterToWindow(items, 60, NOW);
    expect(result).toHaveLength(1);
  });
});

describe("aggregateContentItems", () => {
  it("separates posts (blog) from news and ignores other", () => {
    const items = [
      item({ type: "blog" }), item({ type: "blog" }),
      item({ type: "news" }),
      item({ type: "other" }),
    ];
    const agg = aggregateContentItems(items);
    expect(agg.postsCount).toBe(2);
    expect(agg.newsCount).toBe(1);
  });

  it("computes byline percentage over posts only", () => {
    const items = [
      item({ type: "blog", hasNamedByline: true }),
      item({ type: "blog", hasNamedByline: false }),
      item({ type: "news", hasNamedByline: true }), // must not count toward byline% denominator
    ];
    const agg = aggregateContentItems(items);
    expect(agg.bylinePct).toBeCloseTo(0.5, 5);
  });

  it("returns 0 byline% when there are no posts", () => {
    const agg = aggregateContentItems([item({ type: "news" })]);
    expect(agg.bylinePct).toBe(0);
  });

  it("caps postsCount and newsCount so a degenerate extraction can't inflate the live peer-max forever", () => {
    const manyPosts = Array.from({ length: 500 }, () => item({ type: "blog" }));
    const agg = aggregateContentItems(manyPosts);
    expect(agg.postsCount).toBeLessThanOrEqual(100);
  });
});

describe("calculateThoughtLeadershipScore", () => {
  it("scores the full 45 points when at peer-max and fully bylined", () => {
    const score = calculateThoughtLeadershipScore(10, 5, 1, 10, 5);
    expect(score).toBe(45);
  });

  it("scores 0 when there is no content and no byline", () => {
    const score = calculateThoughtLeadershipScore(0, 0, 0, 10, 5);
    expect(score).toBe(0);
  });

  it("does not divide by zero when peer-max is 0", () => {
    const score = calculateThoughtLeadershipScore(0, 0, 0, 0, 0);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBe(0);
  });

  it("weights posts 25, byline 5, news 15", () => {
    expect(calculateThoughtLeadershipScore(10, 0, 0, 10, 5)).toBeCloseTo(25, 5);
    expect(calculateThoughtLeadershipScore(0, 0, 1, 10, 5)).toBeCloseTo(5, 5);
    expect(calculateThoughtLeadershipScore(0, 5, 0, 10, 5)).toBeCloseTo(15, 5);
  });
});
