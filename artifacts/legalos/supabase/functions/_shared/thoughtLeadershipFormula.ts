// Pure Thought Leadership category math (150 pts — weights in methodology.ts):
// no Deno globals, no network, no cache — kept separate from
// thoughtLeadershipScore.ts so it's importable from a plain Vitest/Node test
// without transitively pulling in cache.ts's top-level Deno.env.get() calls.
//
// Five signals, tilted toward the firm's OWN writing on its OWN site:
//   articles    — own analysis pieces (classifier type "blog"), peer p90Ratio
//   authorship  — share of own pieces with a named lawyer's byline
//   ownNews     — own announcements (type "news" on the firm's own site), peer p90Ratio
//   consistency — share of the content window's months with any own output
//   press       — independent third-party coverage (own domain excluded), peer p90Ratio
// Own writing (articles + authorship + ownNews + consistency) carries 120 of
// the 150 points; independent press carries 30 — enough that real coverage
// matters, never so much that a firm can buy its way past publishing.
//
// articlesCount/ownNewsCount feed a LIVE peer-group comparison (peerStatsFor
// reads other published audits), same poisoning risk as Social self-report —
// a scraped page returning a degenerate item list would otherwise distort
// the comparison set. Cap both at a generous ceiling.
import { CONSISTENCY_BUCKET_DAYS, THOUGHT_LEADERSHIP_WEIGHTS as W, round2, unit } from "./methodology.ts";

export interface ContentItem {
  title: string;
  date: string;
  type: "blog" | "news" | "other";
  hasNamedByline: boolean;
}

export interface ContentAggregate {
  /** All own output in the window (articles + own news) — kept for display and older stored audits. */
  postsCount: number;
  /** Own analysis/insight pieces. */
  articlesCount: number;
  /** Own announcements (deals, hires, awards) published on the firm's site. */
  ownNewsCount: number;
  /** Share (0–1) of own pieces carrying a named lawyer's byline. */
  bylinePct: number;
  /** Months (CONSISTENCY_BUCKET_DAYS each) of the window with at least one own piece. */
  activeMonths: number;
  /** Months the window spans. */
  windowMonths: number;
}

const MAX_ITEMS_PER_CATEGORY = 100;

export function filterToWindow(items: ContentItem[], windowDays: number, now = Date.now()): ContentItem[] {
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  return items.filter((it) => {
    const t = Date.parse(it.date);
    return Number.isFinite(t) && t >= cutoff;
  });
}

export function aggregateContentItems(
  itemsInWindow: ContentItem[],
  windowDays = 90,
  now = Date.now(),
): ContentAggregate {
  // Every item here came from the firm's OWN site, so all of it is own
  // output — the classifier's blog/news label only decides WHICH own signal
  // it feeds (analysis vs announcement), never whether it counts at all.
  // Only "other" (nav links, author bios, unrelated page text) is excluded.
  // Third-party coverage is a separate, external-only axis (pressMentions.ts).
  const own = itemsInWindow.filter((it) => it.type !== "other");
  const articles = own.filter((it) => it.type === "blog");
  const news = own.filter((it) => it.type === "news");
  const bylined = own.filter((it) => it.hasNamedByline);

  const windowMonths = Math.max(1, Math.round(windowDays / CONSISTENCY_BUCKET_DAYS));
  const bucketMs = CONSISTENCY_BUCKET_DAYS * 24 * 60 * 60 * 1000;
  const buckets = new Set<number>();
  for (const it of own) {
    const t = Date.parse(it.date);
    if (!Number.isFinite(t)) continue;
    const b = Math.floor((now - t) / bucketMs);
    if (b >= 0 && b < windowMonths) buckets.add(b);
  }

  return {
    postsCount: Math.min(own.length, MAX_ITEMS_PER_CATEGORY),
    articlesCount: Math.min(articles.length, MAX_ITEMS_PER_CATEGORY),
    ownNewsCount: Math.min(news.length, MAX_ITEMS_PER_CATEGORY),
    bylinePct: own.length > 0 ? bylined.length / own.length : 0,
    activeMonths: buckets.size,
    windowMonths,
  };
}

// Some newsrooms are discovery-dead from the listing side: the homepage and
// every listing path render the same thin shell (or nothing), while the
// article DETAIL pages are server-rendered with real titles/dates/bylines
// (e.g. TYPO3 firms like schoenherr.rs — /news/ is a shell that still links
// to real /news/publication-detail/<slug>/ pages). Following those links one
// level down is what makes such firms measurable at all.
//
// An "article link" heuristic: same host (www-normalized), at least two path
// segments, a slug-like final segment (long or multi-hyphen), and a path that
// passes through a news-ish section. Pure string/DOM-free parsing so it stays
// testable in plain Vitest.
const ARTICLE_PATH_HINT =
  /(news|vesti|novosti|blog|insight|objav|publikac|aktueln|media|press|publication|articl|clanak|clanc|analiz|misli|dogadj)/i;

// Long slugs under these sections are paging/archive/taxonomy/person pages,
// not articles — they would waste the bounded fetch budget and crowd out
// real detail pages (code review).
const NON_ARTICLE_PATH =
  /\/(tag|tags|autor|autori|author|authors|team|tim|archive|arhiva|page|stranica|kategorija|kategorije|category|categories|search|pretraga)(\/|$)/i;

export function extractArticleLinks(html: string, baseUrl: string, max = 8): string[] {
  let baseHost: string;
  try {
    baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let u: URL;
    try {
      u = new URL(m[1], baseUrl);
    } catch {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    if (u.hostname.replace(/^www\./, "") !== baseHost) continue;
    u.hash = "";
    u.search = "";
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length < 2) continue; // section roots, not articles
    const finalSegment = segments[segments.length - 1];
    const slugLike = finalSegment.length >= 20 || (finalSegment.match(/-/g)?.length ?? 0) >= 3;
    if (!slugLike) continue;
    if (!ARTICLE_PATH_HINT.test(u.pathname)) continue;
    if (NON_ARTICLE_PATH.test(u.pathname)) continue;
    if (/\.(jpe?g|png|gif|webp|svg|pdf|zip|css|js|xml)$/i.test(finalSegment)) continue;
    if (seen.has(u.href)) continue;
    seen.add(u.href);
    out.push(u.href);
    if (out.length >= max) break;
  }
  return out;
}

// Merge an extracted item into the accumulator, deduping by normalized title
// (case/punctuation/whitespace-insensitive — "60% stake" vs "60 % stake" is
// the same article). Crucially, a DATED extraction REPLACES an undated one:
// the homepage shell mentions an article without its date, and if that thin
// variant claims the title first, the dated listing/detail extraction gets
// dropped and the firm scores 0 despite publishing (the schoenherr.rs trap).
export function contentItemKey(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "");
}

export function upsertContentItem(items: ContentItem[], indexByKey: Map<string, number>, item: ContentItem): void {
  const k = contentItemKey(item.title);
  if (!k) return;
  const idx = indexByKey.get(k);
  if (idx === undefined) {
    indexByKey.set(k, items.length);
    items.push(item);
    return;
  }
  const existing = items[idx];
  if (!Number.isFinite(Date.parse(existing.date)) && Number.isFinite(Date.parse(item.date))) {
    items[idx] = item;
  }
}

export interface ThoughtLeadershipSignals {
  /** p90Ratio of own articles against the peer group. */
  articlesRatio: number;
  /** Share (0–1) of own pieces with a named lawyer's byline. */
  bylinePct: number;
  /** p90Ratio of own announcements against the peer group. */
  ownNewsRatio: number;
  /** Share (0–1) of the window's months with any own output. */
  consistency: number;
  /** p90Ratio of independent press coverage against the peer group. */
  pressRatio: number;
}

export function calculateThoughtLeadershipScore(s: ThoughtLeadershipSignals): number {
  return round2(
    W.articles * unit(s.articlesRatio)
      + W.authorship * unit(s.bylinePct)
      + W.ownNews * unit(s.ownNewsRatio)
      + W.consistency * unit(s.consistency)
      + W.press * unit(s.pressRatio),
  );
}
