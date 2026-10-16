// Task #167 — programmatic benchmark pages from anonymized audit aggregates.
// Queries market_visibility_audits via the Supabase Management API, keeps
// only markets with a big enough cohort to stay anonymous, and emits:
//   public/benchmarks/<market>.html   — one self-contained branded page each
//   public/benchmarks/index.html      — the index of published markets
//   src/data/benchmarks.ts            — the same aggregates as typed data
//   public/sitemap.xml                — only when SITE_URL is set
// Run on demand (data is live):  SUPABASE_ACCESS_TOKEN=… node scripts/generate-benchmarks.mjs

import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_REF = "qeopoiumlnzqwaqzwqcj";

/** Below this many firms a market page could identify individual firms — suppress it. */
export const MIN_COHORT = 5;

/** Scoring scale — mirrors legalos/supabase/functions/_shared/methodology.ts (v3). */
export const TOTAL_MAX = 500;
export const CATEGORY_MAX = { performance: 50, social: 75, seoAuthority: 100, thoughtLeadership: 150, reputation: 125 };

const CATEGORY_LABELS = {
  performance_pct: ["Website experience", "page speed, accessibility & technical basics"],
  social_pct: ["Social presence", "followers, posting & engagement"],
  seo_pct: ["Search authority", "domain strength, links & organic reach"],
  thought_pct: ["Thought leadership", "own-site articles, bylines, consistency & press"],
  reputation_pct: ["Recognition", "directory rankings & Google Business Profile"],
};

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Brand name for og:site_name — matches the "| Uvid" title suffix. */
export const SITE_NAME = "Uvid";

/** Absolute base for canonical/OG URLs, baked from SITE_URL (same env var
 *  that gates the sitemap). Trailing slash stripped; empty when unset, in
 *  which case relative canonical/OG URLs are emitted. */
export const siteBase = (process.env.SITE_URL ?? "").replace(/\/+$/, "");

/**
 * Per-page SEO block: canonical + Open Graph + Twitter card, derived from the
 * page's own title/description/path — no new copy. Absolute when SITE_URL is
 * set, relative otherwise.
 */
export function seoTags(title, description, path) {
  const url = siteBase ? siteBase + path : path;
  return `<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(SITE_NAME)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />`;
}

export const slugify = (market) =>
  String(market).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const displayMarket = (market) =>
  String(market).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Keep only publishable cohorts (anonymity threshold), biggest first. */
export const filterCohorts = (rows) =>
  rows
    .map((r) => ({ ...r, firms: Number(r.firms) }))
    .filter((r) => r.firms >= MIN_COHORT && slugify(r.market))
    .sort((a, b) => b.firms - a.firms);

/** The two categories where the cohort loses the most points, weakest first. */
export const weakestCategories = (cohort) =>
  Object.keys(CATEGORY_LABELS)
    .map((k) => ({ key: k, pct: Number(cohort[k]) || 0 }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 2);

const BRAND_CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body { background: hsl(30 28% 5%); color: hsl(43 30% 92%); font-family: Georgia, 'Times New Roman', serif; min-height: 100vh; }
  .eyebrow { font-family: ui-sans-serif, system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.22em; font-size: 10px; color: hsl(43 57% 49%); }
  .wrap { max-width: 44rem; margin: 0 auto; padding: 4rem 1.5rem; }
  h1 { font-size: 2rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
  .sub { color: hsl(30 10% 62%); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.95rem; line-height: 1.6; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 1px; background: hsl(30 14% 16%); border: 1px solid hsl(30 14% 16%); margin: 2rem 0; }
  .stat { background: hsl(30 22% 8%); padding: 1.1rem; }
  .stat b { display: block; font-size: 1.6rem; color: hsl(43 57% 55%); }
  .stat span { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.7rem; color: hsl(30 10% 56%); text-transform: uppercase; letter-spacing: 0.12em; }
  .weak { margin: 2rem 0; }
  .weak .row { margin-top: 1rem; }
  .weak .bar { height: 6px; background: hsl(30 14% 16%); margin-top: 0.4rem; }
  .weak .bar i { display: block; height: 100%; background: hsl(43 57% 49%); }
  .weak p { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.85rem; color: hsl(30 10% 68%); }
  .cta { display: inline-block; margin-top: 2.5rem; background: hsl(43 57% 49%); color: hsl(30 28% 8%); font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 600; font-size: 0.9rem; padding: 0.8rem 1.6rem; text-decoration: none; border-radius: 2px; }
  .fineprint { margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid hsl(30 14% 16%); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.72rem; color: hsl(30 10% 46%); line-height: 1.6; }
  a.back { color: hsl(43 57% 55%); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.8rem; }
  ul.index { list-style: none; padding: 0; margin-top: 1.5rem; }
  ul.index li { border: 1px solid hsl(30 14% 16%); background: hsl(30 22% 8%); margin-bottom: 0.6rem; }
  ul.index a { display: flex; justify-content: space-between; align-items: baseline; padding: 1rem 1.25rem; text-decoration: none; color: inherit; }
  ul.index a:hover { border-color: hsl(43 57% 49%); }
  ul.index .n { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.75rem; color: hsl(30 10% 56%); }
`;

export function renderCohortPage(c) {
  const name = displayMarket(c.market);
  const weakest = weakestCategories(c);
  const avg = Number(c.avg_total), median = Number(c.median_total);
  const title = `Law firm website benchmarks — ${name} | Uvid`;
  const description = `How ${c.firms} ${name} law firm websites actually score on performance, SEO authority, thought leadership and reputation — measured benchmarks, not opinions.`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
${seoTags(title, description, `/benchmarks/${slugify(c.market)}.html`)}
<style>${BRAND_CSS}</style>
</head>
<body>
<div style="height:220px;background:linear-gradient(to bottom, rgba(16,13,9,.35), hsl(30 28% 5%)), url('/benchmarks-header.jpg') center/cover;"></div>
<main class="wrap" style="padding-top:2.5rem">
  <p class="eyebrow">Uvid benchmarks · ${esc(name)}</p>
  <h1>How ${esc(name)} law firm websites actually score</h1>
  <p class="sub">Measured across ${c.firms} firm websites in ${esc(name)} — website experience, social presence, search authority, thought leadership and recognition, on a ${TOTAL_MAX}-point scale.</p>

  <div class="stats">
    <div class="stat"><b>${c.firms}</b><span>firms measured</span></div>
    <div class="stat"><b>${avg}<small style="font-size:0.9rem;color:hsl(30 10% 56%)"> /${TOTAL_MAX}</small></b><span>average score</span></div>
    <div class="stat"><b>${median}</b><span>median</span></div>
    <div class="stat"><b>${Math.round(Number(c.min_total))}–${Math.round(Number(c.max_total))}</b><span>range</span></div>
  </div>

  <section class="weak">
    <p class="eyebrow">Where ${esc(name)} firms lose the most points</p>
    ${weakest
      .map(
        (w) => `<div class="row">
      <p><strong style="color:hsl(43 57% 55%)">${CATEGORY_LABELS[w.key][0]}</strong> — ${CATEGORY_LABELS[w.key][1]} · averaging ${Math.round(w.pct)}% of available points</p>
      <div class="bar"><i style="width:${Math.max(2, Math.min(100, Math.round(w.pct)))}%"></i></div>
    </div>`,
      )
      .join("\n    ")}
  </section>

  <a class="cta" href="/">See how your firm scores →</a>

  <p class="fineprint">Based on ${c.firms} anonymized Uvid audits of ${esc(name)} law firm websites. No individual firm is identified, and markets with fewer than ${MIN_COHORT} measured firms are never published. <a class="back" href="/benchmarks/">All benchmarks</a> · <a class="back" href="/">Uvid</a></p>
</main>
</body>
</html>
`;
}

export function renderIndexPage(cohorts) {
  const title = "Law firm website benchmarks | Uvid";
  const description =
    "Measured visibility benchmarks for law firms by market — website experience, search authority, thought leadership and recognition, from anonymized Uvid audits.";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
${seoTags(title, description, "/benchmarks/")}
<style>${BRAND_CSS}</style>
</head>
<body>
<div style="height:220px;background:linear-gradient(to bottom, rgba(16,13,9,.35), hsl(30 28% 5%)), url('/benchmarks-header.jpg') center/cover;"></div>
<main class="wrap" style="padding-top:2.5rem">
  <p class="eyebrow">Uvid benchmarks</p>
  <h1>Law firm website benchmarks by market</h1>
  <p class="sub">Real measured scores, not opinions. A market appears once at least ${MIN_COHORT} firms have been audited there, so no firm is ever identifiable.</p>
  ${
    cohorts.length
      ? `<ul class="index">
    ${cohorts
      .map(
        (c) =>
          `<li><a href="/benchmarks/${slugify(c.market)}.html"><span>${esc(displayMarket(c.market))}</span><span class="n">${c.firms} firms · avg ${Number(c.avg_total)}/${TOTAL_MAX}</span></a></li>`,
      )
      .join("\n    ")}
  </ul>`
      : `<p class="sub" style="margin-top:1.5rem">No market has enough measured firms yet — check back soon, or <a class="back" href="/">be the first firm measured in yours</a>.</p>`
  }
  <a class="cta" href="/">Score your firm →</a>
  <p class="fineprint"><a class="back" href="/">Uvid</a> — the marketing operating system for law firms.</p>
</main>
</body>
</html>
`;
}

// DISTINCT audited_domain: a firm is a domain, not a row — the table is
// unique on (client_id, domain, market), so a bare COUNT(*) could count one
// firm several times and overstate the cohort (code review, task #167).
const AGGREGATE_SQL = `
SELECT market,
       COUNT(DISTINCT audited_domain) AS firms,
       ROUND(AVG(total_score)) AS avg_total,
       ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_score))::numeric) AS median_total,
       MIN(total_score) AS min_total,
       MAX(total_score) AS max_total,
       ROUND(AVG(performance_score) / ${CATEGORY_MAX.performance} * 100) AS performance_pct,
       ROUND(AVG(social_score) / ${CATEGORY_MAX.social} * 100) AS social_pct,
       ROUND(AVG(seo_authority_score) / ${CATEGORY_MAX.seoAuthority} * 100) AS seo_pct,
       ROUND(AVG(thought_leadership_score) / ${CATEGORY_MAX.thoughtLeadership} * 100) AS thought_pct,
       ROUND(AVG(reputation_score) / ${CATEGORY_MAX.reputation} * 100) AS reputation_pct
FROM market_visibility_audits
WHERE methodology_version >= 3
GROUP BY market
HAVING COUNT(DISTINCT audited_domain) >= ${MIN_COHORT}
ORDER BY firms DESC`;

/**
 * Reconciliation (code review, task #167): a market whose cohort falls below
 * MIN_COHORT must have its page DELETED, not just dropped from the index —
 * otherwise a stale static URL keeps serving aggregates we promised to
 * suppress. Returns the generated market files that should not exist.
 */
export function staleMarketPages(existingFiles, cohorts) {
  const live = new Set(cohorts.map((c) => `${slugify(c.market)}.html`));
  return existingFiles.filter((f) => f.endsWith(".html") && f !== "index.html" && !live.has(f));
}

export function renderSitemap(cohorts, siteUrl) {
  // Homepage + benchmarks index + one entry per published market. The guidebook
  // generator (run last) re-emits this file merging in the guidebook URLs too.
  const urls = ["/", "/benchmarks/", ...cohorts.map((c) => `/benchmarks/${slugify(c.market)}.html`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl.replace(/\/$/, "")}${u}</loc></url>`).join("\n")}
</urlset>
`;
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("SUPABASE_ACCESS_TOKEN is required (Management API). Skipping benchmark generation.");
    process.exit(1);
  }
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: AGGREGATE_SQL }),
  });
  if (!resp.ok) throw new Error(`Management API HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const rows = await resp.json();
  const cohorts = filterCohorts(rows);

  const outDir = join(ROOT, "public", "benchmarks");
  mkdirSync(outDir, { recursive: true });
  for (const stale of staleMarketPages(readdirSync(outDir), cohorts)) {
    unlinkSync(join(outDir, stale));
    console.log(`benchmarks: pruned stale page ${stale} (cohort below the anonymity threshold)`);
  }
  writeFileSync(join(outDir, "index.html"), renderIndexPage(cohorts));
  for (const c of cohorts) {
    writeFileSync(join(outDir, `${slugify(c.market)}.html`), renderCohortPage(c));
  }
  writeFileSync(
    join(ROOT, "src", "data", "benchmarks.ts"),
    `// GENERATED by scripts/generate-benchmarks.mjs — do not hand-edit.\n// Anonymized per-market audit aggregates (min cohort ${MIN_COHORT}). Regenerate: pnpm run generate:benchmarks\n\nexport interface BenchmarkCohort {\n  market: string;\n  firms: number;\n  avgTotal: number;\n  medianTotal: number;\n  minTotal: number;\n  maxTotal: number;\n}\n\nexport const BENCHMARKS: BenchmarkCohort[] = ${JSON.stringify(
      cohorts.map((c) => ({
        market: c.market,
        firms: c.firms,
        avgTotal: Number(c.avg_total),
        medianTotal: Number(c.median_total),
        minTotal: Number(c.min_total),
        maxTotal: Number(c.max_total),
      })),
      null,
      2,
    )};\n`,
  );

  const siteUrl = process.env.SITE_URL;
  if (siteUrl) {
    writeFileSync(join(ROOT, "public", "sitemap.xml"), renderSitemap(cohorts, siteUrl));
  }

  console.log(`benchmarks: ${cohorts.length} market page(s) published (${cohorts.map((c) => c.market).join(", ") || "none above the anonymity threshold"})${siteUrl ? " + sitemap.xml" : ""}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
