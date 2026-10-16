// Pure renderers for the public guidebook excerpt pages — no I/O, no
// imports, so both the generator (tsx) and the vitest suite can use them.
// Mirrors the benchmarks generator's rules: escape every interpolated
// string, publish an excerpt that earns the click without giving the whole
// chapter away, and route every CTA into the teaser funnel.

/** Where every guidebook CTA lands — the teaser is the primary funnel. */
export const GUIDEBOOK_CTA_URL = "/app/teaser?utm_source=guidebook&utm_medium=excerpt";

/** Brand name for og:site_name — matches the benchmarks pages ("| Uvid"). */
export const SITE_NAME = "Uvid";

/** Absolute base for canonical/OG URLs. Baked at generation time from
 *  SITE_URL (the same shared env var that gates the sitemap), so the
 *  committed pages carry deployment-absolute URLs. Trailing slash stripped;
 *  empty when SITE_URL is unset (then only relative canonical/OG are emitted). */
export const siteBase = (process.env.SITE_URL ?? "").replace(/\/+$/, "");

/**
 * Per-page SEO block: canonical link + Open Graph + Twitter card. Derived
 * entirely from the page title/description/path the renderers already have —
 * no new marketing copy. URLs are absolute when SITE_URL is set, otherwise
 * relative (still valid canonicals for a same-origin static site).
 */
export function seoTags(title, description, path) {
  const url = siteBase ? siteBase + path : path;
  return `<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">`;
}

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/**
 * The public excerpt: hook + the first section's opening (at most two
 * paragraphs) + a count teaser of what stays gated. Never includes action
 * item bodies, artifacts, or later sections — those are the product.
 */
export function excerptChapter(chapter) {
  const first = (chapter.content ?? [])[0] ?? {};
  const paragraphs = (first.paragraphs ?? []).slice(0, 2);
  return {
    heading: first.heading ?? null,
    paragraphs,
    actionCount: (chapter.actionItems ?? []).length,
    artifactTitles: (chapter.artifacts ?? []).map((a) => a.title),
  };
}

/**
 * Generated excerpt files that should no longer exist — same reconciliation
 * rule as the benchmark pages: a chapter removed from the canonical book
 * must have its public page deleted, not just dropped from the index.
 */
export function staleGuidebookPages(existingFiles, chapters) {
  const live = new Set(chapters.map((c) => `${c.id}.html`));
  return existingFiles.filter((f) => f.endsWith(".html") && f !== "index.html" && !live.has(f));
}

const BRAND = `
  :root { color-scheme: dark; }
  body { margin: 0; background: hsl(30 28% 5%); color: hsl(40 20% 92%);
         font-family: Georgia, 'Times New Roman', serif; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 48px 24px 96px; }
  .eyebrow { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 0.22em;
             text-transform: uppercase; color: hsl(43 57% 49%); }
  h1 { font-size: 34px; line-height: 1.15; margin: 16px 0 8px; }
  .subtitle { font-size: 18px; color: hsl(40 12% 66%); font-style: italic; margin: 0 0 32px; }
  .hook { border-left: 2px solid hsl(43 57% 49%); padding: 4px 0 4px 20px;
          font-size: 19px; line-height: 1.5; margin: 0 0 32px; }
  h2 { font-size: 22px; margin: 32px 0 12px; }
  p { font-size: 17px; line-height: 1.65; color: hsl(40 14% 80%); }
  .gated { margin-top: 40px; border: 1px solid hsl(43 57% 49% / 0.35); border-radius: 12px;
           padding: 24px; background: hsl(30 24% 7%); }
  .gated ul { margin: 12px 0 0; padding-left: 20px; color: hsl(40 14% 80%); font-size: 15px; line-height: 1.7; }
  .cta { display: inline-block; margin-top: 20px; background: hsl(43 57% 49%); color: hsl(30 28% 8%);
         font-family: ui-monospace, monospace; font-size: 13px; letter-spacing: 0.08em; font-weight: 700;
         padding: 14px 22px; border-radius: 8px; text-decoration: none; text-transform: uppercase; }
  .back { font-family: ui-monospace, monospace; font-size: 12px; color: hsl(40 12% 66%); text-decoration: none; }
  ol.index { list-style: none; margin: 32px 0 0; padding: 0; }
  ol.index li { border-top: 1px solid hsl(30 15% 14%); padding: 18px 0; }
  ol.index a { color: inherit; text-decoration: none; display: block; }
  ol.index a:hover h2 { color: hsl(43 57% 49%); }
  ol.index h2 { margin: 0 0 4px; font-size: 20px; }
  ol.index .sub { color: hsl(40 12% 66%); font-size: 15px; font-style: italic; margin: 0; }
  .num { font-family: ui-monospace, monospace; color: hsl(43 57% 49%); font-size: 12px; letter-spacing: 0.15em; }
`;

const page = (title, description, path, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${seoTags(title, description, path)}
<style>${BRAND}</style>
</head>
<body>
<div style="height:180px;background:linear-gradient(to bottom, rgba(16,13,9,.35), hsl(30 28% 5%)), url('/guidebook-header.jpg') center/cover;"></div>
<div class="wrap" style="padding-top:2.5rem">${body}</div></body>
</html>
`;

export function renderChapterPage(chapter) {
  const ex = excerptChapter(chapter);
  const gated = [
    ...(ex.actionCount > 0 ? [`${ex.actionCount} prioritised action items`] : []),
    ...ex.artifactTitles,
  ];
  return page(
    `${chapter.title} — Uvid Visibility Playbook`,
    `${chapter.subtitle} A chapter from the Uvid Visibility Playbook for law firms.`,
    `/guidebook/${chapter.id}.html`,
    `<a class="back" href="/guidebook/">← The Visibility Playbook</a>
<p class="eyebrow" style="margin-top:24px">Chapter ${esc(chapter.number)}</p>
<h1>${esc(chapter.title)}</h1>
<p class="subtitle">${esc(chapter.subtitle)}</p>
${chapter.hook ? `<p class="hook">${esc(chapter.hook)}</p>` : ""}
${ex.heading ? `<h2>${esc(ex.heading)}</h2>` : ""}
${ex.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n")}
<div class="gated">
  <p class="eyebrow">The full chapter continues in the app</p>
  ${gated.length ? `<ul>${gated.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
  <a class="cta" href="${GUIDEBOOK_CTA_URL}">Run your free audit to unlock</a>
</div>`,
  );
}

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS_WORDS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Prose count for marketing copy ("twenty-one"); digits past 99. */
export function numberWord(n) {
  if (n < 20) return NUMBER_WORDS[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return TENS_WORDS[tens] + (ones ? `-${NUMBER_WORDS[ones]}` : "");
  }
  return String(n);
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function renderGuidebookIndex(chapters) {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  return page(
    "The Visibility Playbook — Uvid",
    `The operating manual for law-firm market visibility: ${sorted.length} chapters, each tied to a measured score category.`,
    "/guidebook/",
    `<p class="eyebrow">Uvid</p>
<h1>The Visibility Playbook</h1>
<p class="subtitle">${capitalize(numberWord(sorted.length))} chapters on how law firms win market visibility — each tied to a number we measure. Opening excerpts are public; the full playbook unlocks with your free audit.</p>
<ol class="index">
${sorted
  .map(
    (c) => `  <li><a href="/guidebook/${esc(c.id)}.html"><span class="num">${String(c.number).padStart(2, "0")}</span><h2>${esc(c.title)}</h2><p class="sub">${esc(c.subtitle)}</p></a></li>`,
  )
  .join("\n")}
</ol>
<a class="cta" href="${GUIDEBOOK_CTA_URL}">Run your free audit</a>`,
  );
}

/** One sitemap for everything static the marketing site publishes — the
 *  benchmarks generator may have already written one, so callers pass the
 *  full URL list (benchmarks + guidebook) and this rewrites the file. */
export function renderSitemap(urls, siteUrl) {
  const base = String(siteUrl ?? "").replace(/\/+$/, "");
  if (!base) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(base + u)}</loc></url>`).join("\n")}
</urlset>
`;
}
