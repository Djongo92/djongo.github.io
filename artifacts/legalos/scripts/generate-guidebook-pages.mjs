#!/usr/bin/env node
// Generates the public guidebook excerpt pages for the marketing site from
// the canonical web guidebook (single source of truth — never copy chapter
// text into the marketing repo). Run with tsx:
//   pnpm --filter @workspace/legalos run generate:guidebook-pages
//
// Emits into ../legalos-marketing/public/guidebook/ (index + one page per
// chapter) and rewrites public/sitemap.xml with BOTH benchmark and
// guidebook URLs — only when SITE_URL is set (same rule as the benchmarks
// generator, which owns its own sitemap when run alone; run this one last).
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chapters } from "../src/data/chapters.ts";
import { renderChapterPage, renderGuidebookIndex, renderSitemap, staleGuidebookPages } from "./guidebookPageRender.mjs";

const MARKETING_PUBLIC = new URL("../../legalos-marketing/public/", import.meta.url).pathname;
const outDir = join(MARKETING_PUBLIC, "guidebook");
mkdirSync(outDir, { recursive: true });

// Reconcile first: a chapter removed from the canonical book loses its page.
for (const stale of staleGuidebookPages(readdirSync(outDir), chapters)) {
  unlinkSync(join(outDir, stale));
  console.log(`guidebook: pruned stale page ${stale}`);
}

writeFileSync(join(outDir, "index.html"), renderGuidebookIndex(chapters));
for (const chapter of chapters) {
  writeFileSync(join(outDir, `${chapter.id}.html`), renderChapterPage(chapter));
}
console.log(`guidebook: ${chapters.length} excerpt page(s) published`);

// Merge benchmarks + guidebook into one sitemap (SITE_URL-gated).
const siteUrl = process.env.SITE_URL;
if (siteUrl) {
  const benchmarksDir = join(MARKETING_PUBLIC, "benchmarks");
  const benchmarkUrls = existsSync(benchmarksDir)
    ? readdirSync(benchmarksDir)
        .filter((f) => f.endsWith(".html"))
        .map((f) => (f === "index.html" ? "/benchmarks/" : `/benchmarks/${f}`))
    : [];
  const guidebookUrls = ["/guidebook/", ...chapters.map((c) => `/guidebook/${c.id}.html`)];
  // Homepage first, then benchmarks, then guidebook — one entry per public page.
  const urls = ["/", ...benchmarkUrls, ...guidebookUrls];
  writeFileSync(join(MARKETING_PUBLIC, "sitemap.xml"), renderSitemap(urls, siteUrl));
  console.log(`guidebook: sitemap.xml rewritten with ${urls.length} URLs`);
} else {
  console.log("guidebook: SITE_URL not set — sitemap skipped");
}
