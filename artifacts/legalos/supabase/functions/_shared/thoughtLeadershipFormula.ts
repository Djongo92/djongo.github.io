// Pure Thought Leadership category math (45 pts): no Deno globals, no
// network, no cache — kept separate from thoughtLeadershipScore.ts so it's
// importable from a plain Vitest/Node test without transitively pulling in
// cache.ts's top-level Deno.env.get() calls.
//
// 25×posts-ratio + 5×byline% + 15×news-ratio, where each ratio is
// p90Ratio() against the peer group's 90th percentile (percentileFormula.ts)
// rather than dividing by the observed maximum.
//
// postsCount/newsCount feed a LIVE peer-group comparison (peerStatsFor reads
// other published audits), same poisoning risk as Social self-report — a
// scraped page returning a degenerate item list would otherwise distort the
// comparison set. Cap both at a generous ceiling.
export interface ContentItem {
  title: string;
  date: string;
  type: "blog" | "news" | "other";
  hasNamedByline: boolean;
}

export interface ContentAggregate {
  postsCount: number;
  bylinePct: number;
}

const MAX_ITEMS_PER_CATEGORY = 100;

export function filterToWindow(items: ContentItem[], windowDays: number, now = Date.now()): ContentItem[] {
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  return items.filter((it) => {
    const t = Date.parse(it.date);
    return Number.isFinite(t) && t >= cutoff;
  });
}

export function aggregateContentItems(itemsInWindow: ContentItem[]): ContentAggregate {
  // Every item here came from the firm's OWN site, so the posts axis is
  // decided by SOURCE, not by the classifier's topic guess: an own-newsroom
  // announcement typed "news" is still the firm's own published output. The
  // LLM's blog/news distinction previously zeroed firms whose newsroom items
  // read as third-person announcements (not "blog" → not posts; self-scraped
  // → not external press) — counted nowhere despite real output. Only
  // "other" (nav links, author bios, unrelated page text) is excluded.
  // Third-party coverage is a separate, external-only axis (pressMentions.ts).
  const posts = itemsInWindow.filter((it) => it.type !== "other");
  const bylined = posts.filter((it) => it.hasNamedByline);

  const postsCount = Math.min(posts.length, MAX_ITEMS_PER_CATEGORY);
  const bylinePct = posts.length > 0 ? bylined.length / posts.length : 0;

  return { postsCount, bylinePct };
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

export function calculateThoughtLeadershipScore(
  postsRatio: number,
  bylinePct: number,
  newsRatio: number,
): number {
  const postsScore = 25 * postsRatio;
  const bylineScore = 5 * bylinePct;
  const newsScore = 15 * newsRatio;

  return Math.round((postsScore + bylineScore + newsScore) * 100) / 100;
}
