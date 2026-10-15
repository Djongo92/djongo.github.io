// Task #167 — benchmark generator invariants: anonymity threshold, honest
// content, HTML escaping, and the growth CTA.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_COHORT,
  filterCohorts,
  weakestCategories,
  renderCohortPage,
  renderIndexPage,
  renderSitemap,
  staleMarketPages,
  slugify,
  esc,
} from "./generate-benchmarks.mjs";

const COHORT = {
  market: "serbia",
  firms: 8,
  avg_total: "37",
  median_total: "35",
  min_total: "16.7",
  max_total: "66.23",
  performance_pct: "41",
  social_pct: "22",
  seo_pct: "18",
  thought_pct: "12",
  reputation_pct: "30",
};

test("cohorts below the anonymity threshold are never published", () => {
  const tiny = { ...COHORT, market: "luxembourg", firms: MIN_COHORT - 1 };
  const kept = filterCohorts([tiny, COHORT]);
  assert.deepEqual(kept.map((c) => c.market), ["serbia"]);
  assert.equal(filterCohorts([]).length, 0);
});

test("weakest categories are the lowest-scoring two, weakest first", () => {
  const w = weakestCategories(COHORT);
  assert.equal(w.length, 2);
  assert.equal(w[0].key, "thought_pct");
  assert.equal(w[1].key, "seo_pct");
});

test("cohort page carries the stats, the anonymity fine print, and the funnel CTA", () => {
  const html = renderCohortPage(COHORT);
  assert.match(html, /Serbia/);
  assert.match(html, /8 firms measured|>8</);
  assert.match(html, /\/200/);
  assert.match(html, /no firm is ever identifiable|fewer than 5 measured firms/i);
  assert.match(html, /href="\/"[^>]*>See how your firm scores/);
  assert.match(html, /<title>Law firm website benchmarks — Serbia \| Uvid<\/title>/);
});

test("hostile market names are escaped and slugified", () => {
  const hostile = { ...COHORT, market: 'serbia"><script>alert(1)</script>' };
  const html = renderCohortPage(hostile);
  assert.ok(!html.includes("<script>alert(1)</script>"), "raw market name must never reach the HTML");
  assert.match(html, /&lt;script&gt;/i); // displayMarket() title-cases before escaping
  assert.equal(slugify(hostile.market), "serbia-script-alert-1-script");
  assert.equal(esc('<b>"x"</b>'), "&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
});

test("index lists published markets and degrades honestly when none qualify", () => {
  const withOne = renderIndexPage([COHORT]);
  assert.match(withOne, /href="\/benchmarks\/serbia\.html"/);
  const empty = renderIndexPage([]);
  assert.match(empty, /No market has enough measured firms yet/);
  assert.ok(!empty.includes("/benchmarks/serbia.html"));
});

test("sitemap is emitted only against an explicit site URL", () => {
  const xml = renderSitemap([COHORT], "https://example.com/");
  assert.match(xml, /<loc>https:\/\/example\.com\/benchmarks\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.com\/benchmarks\/serbia\.html<\/loc>/);
});

// Code review on task #167: a formerly eligible market that drops below the
// anonymity threshold must have its page REMOVED — a stale URL serving
// aggregates would break the "never published below 5" promise.
test("pages for suppressed markets are pruned, live pages and the index kept", () => {
  const onDisk = ["index.html", "serbia.html", "luxembourg.html", "notes.txt"];
  assert.deepEqual(staleMarketPages(onDisk, [COHORT]), ["luxembourg.html"]);
  assert.deepEqual(staleMarketPages(onDisk, []), ["serbia.html", "luxembourg.html"]);
});
