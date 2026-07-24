// Thought Leadership category (45 pts): 25×posts/peer-max + 5×byline% +
// 15×news/peer-max, over the market's contentWindowDays.
//
// "posts" = self-authored blog content (type "blog"), scraped from the
// firm's own site and LLM-classified — legitimate to self-source since
// it's measuring the firm's own output. Byline% is measured over posts
// only — a press mention about the firm doesn't carry an authorship
// byline the way a blog post does.
//
// "news" used to ALSO come from that same self-scraped page (an LLM
// tagging items as type "news"), which meant a firm could inflate its own
// "press coverage" score just by writing about itself — no independent
// check. It now comes from findPressMentions(), a real query against
// Google News' public RSS search with the firm's own domain explicitly
// excluded from the results — a source the firm doesn't control. See
// pressMentionsFormula.ts for the exclusion logic.
//
// peer-max here means the live current maximum among OTHER published
// audits sharing market+peer_group (raw_metrics.thoughtLeadership), per
// CLAUDE.md's peer-group-normalized definition — unlike Reputation, this
// signal has no static reference table, so it necessarily depends on
// other firms having run the audit. Includes the firm's own just-computed
// value in the max so a lone/first audit in a peer group normalizes to
// itself rather than dividing by zero.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { safeFetch, normalizeUrl } from "./safeFetch.ts";
import { getCached, setCached } from "./cache.ts";
import { DMV_MARKETS } from "./marketVisibilityConfig.ts";
import { peerMaxFor } from "./peerMax.ts";
import { filterToWindow, aggregateContentItems, calculateThoughtLeadershipScore, type ContentItem } from "./thoughtLeadershipFormula.ts";
import { findPressMentions } from "./pressMentions.ts";
import type { PressMention } from "./pressMentionsFormula.ts";
import { callClaudeTool } from "./anthropic.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type { ContentItem };

export interface ThoughtLeadershipResult {
  score: number;
  raw: {
    postsCount: number; newsCount: number; bylinePct: number; items: ContentItem[]; pressMentions: PressMention[];
    postsPeerMax?: number; newsPeerMax?: number;
  };
  provenance: "ai_classified" | "missing";
}

async function extractContentItems(pageText: string, pageTitle: string): Promise<ContentItem[]> {
  const result = await callClaudeTool({
    system:
      "You extract a list of articles/posts from a law firm's blog or news page. For each distinct article you can identify, return its title, its publication date (ISO 8601 'YYYY-MM-DD' if determinable, otherwise your best estimate), whether it's the firm's own blog/thought-leadership content ('blog'), a news/press mention about the firm ('news'), or neither ('other'), and whether it's attributed to a named individual (a named partner/associate) rather than the firm generically or no byline at all.",
    user: `Page title: ${pageTitle}\n\nPage content (excerpted):\n${pageText}`,
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
  displayName?: string | null,
): Promise<ThoughtLeadershipResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.warn("[visibility-audit-thought-leadership] ANTHROPIC_API_KEY not configured — scoring as missing");
    return { score: 0, raw: { postsCount: 0, newsCount: 0, bylinePct: 0, items: [], pressMentions: [] }, provenance: "missing" };
  }

  const normalizedUrl = normalizeUrl(url);
  const cached = await getCached("visibility-audit-thought-leadership", normalizedUrl);
  let items: ContentItem[];
  let pageTitle = "";

  if (cached.hit) {
    items = (cached.hit as { items: ContentItem[] }).items;
  } else {
    try {
      const siteRes = await safeFetch(normalizedUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalOS/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!siteRes.ok) throw new Error(`HTTP ${siteRes.status}`);
      const html = await siteRes.text();
      pageTitle = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim();
      const pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 12000);

      items = await extractContentItems(pageText, pageTitle);
      await setCached(cached.key, "visibility-audit-thought-leadership", normalizedUrl, { items }, SEVEN_DAYS_MS);
    } catch (e) {
      console.error("[visibility-audit-thought-leadership] fetch/extract failed:", e);
      return { score: 0, raw: { postsCount: 0, newsCount: 0, bylinePct: 0, items: [], pressMentions: [] }, provenance: "missing" };
    }
  }

  const marketConfig = DMV_MARKETS[market];
  const windowDays = marketConfig?.contentWindowDays ?? 60;
  const inWindow = filterToWindow(items, windowDays);
  const { postsCount, bylinePct } = aggregateContentItems(inWindow);

  // Real, external check — not the self-scraped "type: news" items above.
  // Falls back to the page title (best-effort) if no firm name was given;
  // an empty query short-circuits to no mentions rather than a noisy guess.
  const searchName = (displayName ?? "").trim() || pageTitle;
  const pressMentions = await findPressMentions(searchName, normalizedUrl, windowDays).catch((e) => {
    console.error("[visibility-audit-thought-leadership] press mention lookup failed:", e);
    return [];
  });
  const newsCount = pressMentions.length;

  const postsPeerMax = await peerMaxFor(serviceClient, market, peerGroup, "thoughtLeadership", "postsCount", postsCount);
  const newsPeerMax = await peerMaxFor(serviceClient, market, peerGroup, "thoughtLeadership", "newsCount", newsCount);

  const score = calculateThoughtLeadershipScore(postsCount, newsCount, bylinePct, postsPeerMax, newsPeerMax);

  return {
    score,
    // postsPeerMax/newsPeerMax persisted alongside the inputs — same reasoning
    // as socialScore.ts — so a client can re-derive this formula's output for
    // a hypothetical input without a live peerMaxFor query it can't run.
    raw: { postsCount, newsCount, bylinePct, items: inWindow, pressMentions, postsPeerMax, newsPeerMax },
    provenance: "ai_classified",
  };
}
