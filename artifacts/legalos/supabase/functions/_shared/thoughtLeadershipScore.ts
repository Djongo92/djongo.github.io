// Thought Leadership category (45 pts): 25×posts/peer-max + 5×byline% +
// 15×news/peer-max, over the market's contentWindowDays.
//
// "posts" = everything the firm published on its own site (blog posts AND
// newsroom announcements — the axis is decided by SOURCE, not by the
// classifier's topic label), scraped from the homepage plus common listing
// paths and LLM-classified — legitimate to self-source since it's measuring
// the firm's own output. Byline% is measured over those own-content items —
// a press mention about the firm doesn't carry an authorship byline the way
// a blog post does.
//
// "news" used to ALSO come from that same self-scraped page (an LLM
// tagging items as type "news"), which meant a firm could inflate its own
// "press coverage" score just by writing about itself — no independent
// check. It now comes from findPressMentions(), a real query against
// Google News' public RSS search with the firm's own domain explicitly
// excluded from the results — a source the firm doesn't control. See
// pressMentionsFormula.ts for the exclusion logic.
//
// The peer comparison here is the live 90th percentile among OTHER
// published audits sharing market+peer_group (raw_metrics.thoughtLeadership),
// per percentileFormula.ts — unlike Reputation, this signal has no static
// reference table, so it necessarily depends on other firms having run the
// audit. Includes the firm's own just-computed value in the comparison set
// so a lone/first audit in a peer group normalizes to itself rather than
// dividing by zero.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { safeFetch, normalizeUrl, SELF_IDENTIFYING_UA, BROWSER_FALLBACK_UA } from "./safeFetch.ts";
import { homepageVariants } from "./hostVariants.ts";
import { UNTRUSTED_COPY_RULE, wrapPageCopy } from "./siteCopyInput.ts";
import { getCached, setCached } from "./cache.ts";
import { DMV_MARKETS } from "./marketVisibilityConfig.ts";
import { peerStatsFor } from "./peerStats.ts";
import { p90Ratio, type PeerStats } from "./percentileFormula.ts";
import { filterToWindow, aggregateContentItems, calculateThoughtLeadershipScore, extractArticleLinks, upsertContentItem, contentItemKey, type ContentItem } from "./thoughtLeadershipFormula.ts";
import { findPressMentions } from "./pressMentions.ts";
import type { PressMention } from "./pressMentionsFormula.ts";
import { callClaudeTool } from "./anthropic.ts";
import type { FirmSize } from "./peerDimensions.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Common thought-leadership listing paths, ordered by how often Serbian law
// firm sites use them. Probed only when the homepage itself lists <3 items —
// a firm that publishes only on a subpage must not read as "no output".
const NEWS_PATHS = ["/news", "/novosti", "/vesti", "/blog", "/insights", "/newsroom", "/aktuelnosti", "/media", "/publikacije", "/publications", "/objave"];
const MAX_NEWS_PATH_PROBES = 3;
// Last resort after listing-page probes: follow article-detail links found on
// the pages we already fetched. Server-rendered detail pages carry the dates
// and bylines that shell listing pages lack. One combined extraction call.
const MAX_ARTICLE_PAGES = 4;
// Hard aggregate budget for ALL TL page fetching (homepage + listing probes +
// article fallback). fetchPage retries UA × host-variant at up to 15s per
// attempt; without a shared deadline a worst-case site burns minutes and
// pushes the whole audit past the edge invocation budget (code review).
const TL_FETCH_BUDGET_MS = 60_000;

export type { ContentItem };

export interface ThoughtLeadershipResult {
  score: number;
  raw: {
    postsCount: number; newsCount: number; bylinePct: number; items: ContentItem[]; pressMentions: PressMention[];
    postsStats?: PeerStats; newsStats?: PeerStats;
  };
  provenance: "ai_classified" | "missing";
}

async function extractContentItems(pageText: string, pageTitle: string): Promise<ContentItem[]> {
  const result = await callClaudeTool({
    // The blog/news page is firm-controlled — adversary-controlled prompt
    // content (task #154 completion review). Rule in the system prompt, and
    // title + text enter only through wrapPageCopy (delimiter-spoof safe).
    system:
      "You extract a list of articles/posts from a law firm's blog or news page. For each distinct article you can identify, return its title, its publication date (ISO 8601 'YYYY-MM-DD' if determinable, otherwise your best estimate), whether it's the firm's own blog/thought-leadership content ('blog'), a news/press mention about the firm ('news'), or neither ('other'), and whether it's attributed to a named individual (a named partner/associate) rather than the firm generically or no byline at all. The page may be in any language — for this market it is often Serbian (Latin or Cyrillic) — identify articles, dates, and bylines regardless of language. " +
      UNTRUSTED_COPY_RULE,
    user: wrapPageCopy(`Page title: ${pageTitle}\n\nPage content (excerpted):\n${pageText}`),
    tool: {
      name: "extract_content_items",
      description: "Return the list of articles/posts found on the page",
      input_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                date: { type: "string", description: "ISO 8601 date if determinable, else best-guess YYYY-MM-DD" },
                type: { type: "string", enum: ["blog", "news", "other"] },
                hasNamedByline: { type: "boolean" },
              },
              required: ["title", "date", "type", "hasNamedByline"],
            },
          },
        },
        required: ["items"],
      },
    },
  });

  return Array.isArray(result.items) ? (result.items as ContentItem[]) : [];
}

export async function computeThoughtLeadershipScore(
  serviceClient: SupabaseClient,
  market: string,
  peerGroup: string,
  url: string,
  displayName: string | null | undefined,
  auditedDomain: string,
  firmSize?: FirmSize | null,
): Promise<ThoughtLeadershipResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.warn("[visibility-audit-thought-leadership] ANTHROPIC_API_KEY not configured — scoring as missing");
    return { score: 0, raw: { postsCount: 0, newsCount: 0, bylinePct: 0, items: [], pressMentions: [] }, provenance: "missing" };
  }

  const normalizedUrl = normalizeUrl(url);
  const marketConfig = DMV_MARKETS[market];
  const windowDays = marketConfig?.contentWindowDays ?? 60;
  const cached = await getCached("visibility-audit-thought-leadership-v3", normalizedUrl);
  let items: ContentItem[];
  let pageTitle = "";

  if (cached.hit) {
    items = (cached.hit as { items: ContentItem[] }).items;
  } else {
    try {
      // Retry across host variants and user agents before giving up — an
      // unreachable page must not zero a category we could have measured.
      // Self-identify first; bot protection that 403s non-browser UAs gets
      // the browser fallback (public pages, same content).
      const toText = (html: string): string =>
        html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 12000);

      const fetchDeadline = Date.now() + TL_FETCH_BUDGET_MS;
      // Shell detection: some sites (schoenherr.rs) answer a 200 with the
      // SAME JS-app shell for every path when the UA self-identifies, serving
      // real content only to browser UAs. A fetch whose stripped text is
      // identical to a page we already fetched is a shell, not content —
      // retry with the next UA/host variant. If every attempt is a shell,
      // return the shell (thin content beats none).
      const seenTexts = new Set<string>();
      const fetchPage = async (pageUrl: string): Promise<string | null> => {
        let shellFallback: string | null = null;
        for (const ua of [SELF_IDENTIFYING_UA, BROWSER_FALLBACK_UA]) {
          for (const candidate of homepageVariants(pageUrl)) {
            const remainingMs = fetchDeadline - Date.now();
            if (remainingMs < 2000) return shellFallback; // budget exhausted — stop fetching
            try {
              const res = await safeFetch(candidate, {
                headers: { "User-Agent": ua },
                signal: AbortSignal.timeout(Math.min(15000, remainingMs)),
              });
              if (!res.ok) continue;
              const text = await res.text();
              const norm = toText(text);
              if (!seenTexts.has(norm)) {
                seenTexts.add(norm);
                return text;
              }
              shellFallback ??= text; // duplicate of an earlier page — a shell
            } catch { /* try the next host variant / UA */ }
          }
        }
        return shellFallback;
      };

      // Keep the HTML of every successfully fetched listing page — if listing
      // extraction stays thin, the article-detail links on these pages are the
      // last-resort discovery source (see extractArticleLinks).
      const fetchedPages: { url: string; html: string }[] = [];
      // Any failed extraction call marks the result DEGRADED: the thin item
      // list is returned for scoring but never cached, so a transient Claude
      // outage can't become a 7-day "no output" blackout (the advisory-
      // negative-cache rule — cached failures must fall through to live).
      let extractionDegraded = false;

      const homepageHtml = await fetchPage(normalizedUrl);
      if (homepageHtml === null) throw new Error("homepage unreachable on all host variants");
      fetchedPages.push({ url: normalizedUrl, html: homepageHtml });
      pageTitle = (homepageHtml.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim();
      items = await extractContentItems(toText(homepageHtml), pageTitle);

      // The homepage is not the whole newsroom: firms that publish only on a
      // listing subpage would otherwise read as "no output". Probe the common
      // paths until we have real items or run out of probe budget — each
      // successful probe costs one extraction call.
      const indexByKey = new Map(items.map((it, i) => [contentItemKey(it.title), i] as const));
      let probes = 0;
      for (const path of NEWS_PATHS) {
        if (items.length >= 3 || probes >= MAX_NEWS_PATH_PROBES) break;
        const html = await fetchPage(new URL(path, normalizedUrl).href);
        if (html === null) continue;
        fetchedPages.push({ url: new URL(path, normalizedUrl).href, html });
        probes++;
        const more = await extractContentItems(toText(html), pageTitle).catch(() => {
          extractionDegraded = true;
          return [] as ContentItem[];
        });
        for (const it of more) upsertContentItem(items, indexByKey, it);
      }

      // Listing pages stayed thin — try harder before concluding "no output":
      // follow article-detail links found on the pages we already fetched.
      // Shell-rendered newsrooms (schoenherr.rs) still emit real links to
      // server-rendered detail pages that carry dates and bylines. Bounded:
      // MAX_ARTICLE_PAGES fetches, ONE combined extraction call.
      // Window-aware: a listing of 3+ UNDATED items (all of which the window
      // filter will drop) must still trigger the fallback — dated detail
      // pages are precisely what those listings lack.
      if (filterToWindow(items, windowDays).length < 3 && fetchedPages.length > 0) {
        const visited = new Set(fetchedPages.map((p) => p.url));
        const candidates: string[] = [];
        for (const p of fetchedPages) {
          for (const link of extractArticleLinks(p.html, p.url)) {
            if (!visited.has(link) && !candidates.includes(link)) candidates.push(link);
          }
        }
        const articleTexts: string[] = [];
        for (const link of candidates.slice(0, MAX_ARTICLE_PAGES)) {
          const html = await fetchPage(link);
          if (html !== null) articleTexts.push(toText(html).slice(0, 5000));
        }
        if (articleTexts.length > 0) {
          const combined = articleTexts.map((t, i) => `--- Article page ${i + 1} of ${articleTexts.length} ---\n${t}`).join("\n\n");
          const more = await extractContentItems(combined, pageTitle).catch(() => {
            extractionDegraded = true;
            return [] as ContentItem[];
          });
          for (const it of more) upsertContentItem(items, indexByKey, it);
        }
      }

      if (!extractionDegraded) {
        await setCached(cached.key, "visibility-audit-thought-leadership-v3", normalizedUrl, { items }, SEVEN_DAYS_MS);
      } else {
        console.warn("[visibility-audit-thought-leadership] extraction degraded — returning thin result WITHOUT caching so the next audit retries live");
      }
    } catch (e) {
      console.error("[visibility-audit-thought-leadership] fetch/extract failed:", e);
      return { score: 0, raw: { postsCount: 0, newsCount: 0, bylinePct: 0, items: [], pressMentions: [] }, provenance: "missing" };
    }
  }

  const inWindow = filterToWindow(items, windowDays);
  const { postsCount, bylinePct } = aggregateContentItems(inWindow);

  // Real, external check — not the self-scraped "type: news" items above.
  // Falls back to the page title (best-effort) if no firm name was given;
  // an empty query short-circuits to no mentions rather than a noisy guess.
  const searchName = (displayName ?? "").trim() || pageTitle;
  const pressMentions = await findPressMentions(searchName, normalizedUrl, windowDays, marketConfig?.newsEdition).catch((e) => {
    console.error("[visibility-audit-thought-leadership] press mention lookup failed:", e);
    return [];
  });
  const newsCount = pressMentions.length;

  const [postsStats, newsStats] = await Promise.all([
    peerStatsFor(serviceClient, market, peerGroup, "thoughtLeadership", "postsCount", postsCount, auditedDomain, firmSize),
    peerStatsFor(serviceClient, market, peerGroup, "thoughtLeadership", "newsCount", newsCount, auditedDomain, firmSize),
  ]);

  const score = calculateThoughtLeadershipScore(p90Ratio(postsStats), bylinePct, p90Ratio(newsStats));

  return {
    score,
    // Full six-value peer stats persisted alongside the inputs — same
    // reasoning as socialScore.ts — so a client can re-derive this formula's
    // output for a hypothetical input without a live peerStatsFor query it
    // can't run, and so the number is auditable, not just asserted.
    raw: { postsCount, newsCount, bylinePct, items: inWindow, pressMentions, postsStats, newsStats },
    provenance: "ai_classified",
  };
}
