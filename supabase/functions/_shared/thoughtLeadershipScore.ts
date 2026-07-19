// Thought Leadership category (45 pts): 25×posts/peer-max + 5×byline% +
// 15×news/peer-max, over the market's contentWindowDays.
//
// "posts" = self-authored blog content (type "blog"), "news" = external
// press mentions (type "news"). Byline% is measured over posts only — a
// news mention about the firm doesn't carry an authorship byline the way
// a blog post does.
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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface ContentItem {
  title: string;
  date: string;
  type: "blog" | "news" | "other";
  hasNamedByline: boolean;
}

export interface ThoughtLeadershipResult {
  score: number;
  raw: { postsCount: number; newsCount: number; bylinePct: number; items: ContentItem[] };
  provenance: "ai_classified" | "missing";
}

async function extractContentItems(pageText: string, pageTitle: string, apiKey: string): Promise<ContentItem[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You extract a list of articles/posts from a law firm's blog or news page. For each distinct article you can identify, return its title, its publication date (ISO 8601 'YYYY-MM-DD' if determinable, otherwise your best estimate), whether it's the firm's own blog/thought-leadership content ('blog'), a news/press mention about the firm ('news'), or neither ('other'), and whether it's attributed to a named individual (a named partner/associate) rather than the firm generically or no byline at all.",
        },
        { role: "user", content: `Page title: ${pageTitle}\n\nPage content (excerpted):\n${pageText}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_content_items",
          description: "Return the list of articles/posts found on the page",
          parameters: {
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
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_content_items" } },
    }),
  });

  if (!response.ok) throw new Error(`AI gateway HTTP ${response.status}`);
  const data = await response.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No extraction result");
  const parsed = JSON.parse(args);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

export async function computeThoughtLeadershipScore(
  serviceClient: SupabaseClient,
  market: string,
  peerGroup: string,
  url: string,
): Promise<ThoughtLeadershipResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("[visibility-audit-thought-leadership] LOVABLE_API_KEY not configured — scoring as missing");
    return { score: 0, raw: { postsCount: 0, newsCount: 0, bylinePct: 0, items: [] }, provenance: "missing" };
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

      items = await extractContentItems(pageText, pageTitle, apiKey);
      await setCached(cached.key, "visibility-audit-thought-leadership", normalizedUrl, { items }, SEVEN_DAYS_MS);
    } catch (e) {
      console.error("[visibility-audit-thought-leadership] fetch/extract failed:", e);
      return { score: 0, raw: { postsCount: 0, newsCount: 0, bylinePct: 0, items: [] }, provenance: "missing" };
    }
  }

  const marketConfig = DMV_MARKETS[market];
  const windowDays = marketConfig?.contentWindowDays ?? 60;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  const inWindow = items.filter((it) => {
    const t = Date.parse(it.date);
    return Number.isFinite(t) && t >= cutoff;
  });

  const posts = inWindow.filter((it) => it.type === "blog");
  const news = inWindow.filter((it) => it.type === "news");
  const bylined = posts.filter((it) => it.hasNamedByline);

  const postsCount = posts.length;
  const newsCount = news.length;
  const bylinePct = postsCount > 0 ? bylined.length / postsCount : 0;

  const postsPeerMax = await peerMaxFor(serviceClient, market, peerGroup, "thoughtLeadership", "postsCount", postsCount);
  const newsPeerMax = await peerMaxFor(serviceClient, market, peerGroup, "thoughtLeadership", "newsCount", newsCount);

  const postsScore = postsPeerMax > 0 ? 25 * (postsCount / postsPeerMax) : 0;
  const bylineScore = 5 * bylinePct;
  const newsScore = newsPeerMax > 0 ? 15 * (newsCount / newsPeerMax) : 0;

  const score = Math.round((postsScore + bylineScore + newsScore) * 100) / 100;

  return {
    score,
    raw: { postsCount, newsCount, bylinePct, items: inWindow },
    provenance: "ai_classified",
  };
}
