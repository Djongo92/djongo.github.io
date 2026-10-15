import { describe, it, expect } from "vitest";
import { filterToWindow, aggregateContentItems, calculateThoughtLeadershipScore, extractArticleLinks, upsertContentItem, contentItemKey, type ContentItem } from "./thoughtLeadershipFormula";

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
  it("counts every own-site item (blog or news) as a post and ignores other", () => {
    const items = [
      item({ type: "blog" }), item({ type: "blog" }),
      item({ type: "news" }),
      item({ type: "other" }),
    ];
    const agg = aggregateContentItems(items);
    expect(agg.postsCount).toBe(3);
  });

  it("BDK regression: own-newsroom announcements typed 'news' are the firm's own output, not zero", () => {
    const items = [
      item({ type: "news", title: "Managing IP's 2026 IP STARS rankings" }),
      item({ type: "news", title: "BDK contributes to Chambers Merger Control 2026 guide" }),
      item({ type: "news", title: "Seminar on the new cybersecurity law" }),
    ];
    const agg = aggregateContentItems(items);
    expect(agg.postsCount).toBe(3);
  });

  it("computes byline percentage over all own-content items", () => {
    const items = [
      item({ type: "blog", hasNamedByline: true }),
      item({ type: "blog", hasNamedByline: false }),
      item({ type: "news", hasNamedByline: true }), // own-site news counts too
    ];
    const agg = aggregateContentItems(items);
    expect(agg.bylinePct).toBeCloseTo(2 / 3, 5);
  });

  it("returns 0 byline% when there are no posts", () => {
    const agg = aggregateContentItems([item({ type: "other" })]);
    expect(agg.postsCount).toBe(0);
    expect(agg.bylinePct).toBe(0);
  });

  it("caps postsCount so a degenerate extraction can't inflate the live peer-max forever", () => {
    const manyPosts = Array.from({ length: 500 }, () => item({ type: "blog" }));
    const agg = aggregateContentItems(manyPosts);
    expect(agg.postsCount).toBeLessThanOrEqual(100);
  });
});

describe("calculateThoughtLeadershipScore", () => {
  it("scores the full 45 points at ratio 1 (at or above the 90th percentile) and fully bylined", () => {
    const score = calculateThoughtLeadershipScore(1, 1, 1);
    expect(score).toBe(45);
  });

  it("scores 0 when there is no content and no byline", () => {
    const score = calculateThoughtLeadershipScore(0, 0, 0);
    expect(score).toBe(0);
  });

  it("does not divide by zero or blow up when ratios are 0", () => {
    const score = calculateThoughtLeadershipScore(0, 0, 0);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBe(0);
  });

  it("weights posts 25, byline 5, news 15", () => {
    expect(calculateThoughtLeadershipScore(1, 0, 0)).toBeCloseTo(25, 5);
    expect(calculateThoughtLeadershipScore(0, 1, 0)).toBeCloseTo(5, 5);
    expect(calculateThoughtLeadershipScore(0, 0, 1)).toBeCloseTo(15, 5);
  });
});

describe("extractArticleLinks", () => {
  const BASE = "https://www.schoenherr.rs/news/";

  it("finds TYPO3-style publication-detail links (the schoenherr.rs shell case)", () => {
    const html = `<a href="https://www.schoenherr.rs/news/publication-detail/schoenherr-advises-shareholders-of-comel-on-sale-of-60-stake-to-sgb-smit/">x</a>`;
    const links = extractArticleLinks(html, BASE);
    expect(links).toEqual([
      "https://www.schoenherr.rs/news/publication-detail/schoenherr-advises-shareholders-of-comel-on-sale-of-60-stake-to-sgb-smit/",
    ]);
  });

  it("resolves relative hrefs against the page URL", () => {
    const html = `<a href="/vesti/nekakav-duzi-naslov-clanka-o-pravu/">x</a>`;
    expect(extractArticleLinks(html, "https://firma.rs/vesti")).toEqual([
      "https://firma.rs/vesti/nekakav-duzi-naslov-clanka-o-pravu/",
    ]);
  });

  it("rejects external hosts, top-level sections, and non-slug links", () => {
    const html = `
      <a href="https://other.rs/news/some-very-long-article-title-here/">ext</a>
      <a href="/news/">section</a>
      <a href="/news/page-2">paging</a>
      <a href="/news/2026-real-article-slug-here/">ok</a>`;
    expect(extractArticleLinks(html, BASE)).toEqual([
      "https://www.schoenherr.rs/news/2026-real-article-slug-here/",
    ]);
  });

  it("treats www and non-www as the same host", () => {
    const html = `<a href="https://schoenherr.rs/news/publication-detail/another-article-with-long-slug-here/">x</a>`;
    expect(extractArticleLinks(html, BASE)).toHaveLength(1);
  });

  it("dedupes, strips query/hash, and caps at max", () => {
    const link = "/news/publication-detail/article-with-a-fairly-long-slug-here/?type=500#frag";
    const html = Array.from({ length: 3 }, () => `<a href="${link}">x</a>`).join("");
    const links = extractArticleLinks(html, BASE);
    expect(links).toEqual(["https://www.schoenherr.rs/news/publication-detail/article-with-a-fairly-long-slug-here/"]);
  });

  it("rejects paging, tag, author, and archive paths even with long slugs", () => {
    const html = `
      <a href="/news/tag/corporate-law-updates-serbia-2026/">tag</a>
      <a href="/news/author/jelena-jovanovic-petrovic/">author</a>
      <a href="/news/page/2-older-announcements-archive/">paging</a>
      <a href="/news/publication-detail/real-article-slug-that-is-long/">ok</a>`;
    expect(extractArticleLinks(html, BASE)).toEqual([
      "https://www.schoenherr.rs/news/publication-detail/real-article-slug-that-is-long/",
    ]);
  });

  it("ignores asset files masquerading as slugs", () => {
    const html = `<a href="/media/this-is-a-very-long-file-name.pdf">x</a>`;
    expect(extractArticleLinks(html, BASE)).toEqual([]);
  });

  it("returns [] for an invalid base URL instead of throwing", () => {
    expect(extractArticleLinks("<a href='/news/x-y-z-w-long-enough-slug'>a</a>", "not a url")).toEqual([]);
  });
});

describe("upsertContentItem", () => {
  const buildIndex = (items: ContentItem[]) => new Map(items.map((it, i) => [contentItemKey(it.title), i] as const));

  it("a dated extraction replaces an undated one with the same title (the schoenherr.rs trap)", () => {
    const items = [item({ title: "Comel sale to SGB-SMIT", date: "<UNKNOWN>" })];
    const idx = buildIndex(items);
    upsertContentItem(items, idx, item({ title: "Comel sale to SGB-SMIT", date: daysAgo(10) }));
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe(daysAgo(10));
  });

  it("ignores punctuation-only title differences", () => {
    const items = [item({ title: "Sale of 60% stake to SGB-SMIT", date: "<UNKNOWN>" })];
    const idx = buildIndex(items);
    upsertContentItem(items, idx, item({ title: "Sale of 60 % stake to SGB-SMIT", date: daysAgo(5) }));
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe(daysAgo(5));
  });

  it("keeps the dated original when the incoming item is undated", () => {
    const items = [item({ title: "Bond issuance", date: daysAgo(3) })];
    const idx = buildIndex(items);
    upsertContentItem(items, idx, item({ title: "Bond issuance", date: "<UNKNOWN>" }));
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe(daysAgo(3));
  });

  it("appends genuinely new titles and ignores empty ones", () => {
    const items = [item({ title: "First" })];
    const idx = buildIndex(items);
    upsertContentItem(items, idx, item({ title: "Second" }));
    upsertContentItem(items, idx, item({ title: "   " }));
    expect(items.map((i) => i.title)).toEqual(["First", "Second"]);
  });
});
