// Pure Thought Leadership category math (45 pts): no Deno globals, no
// network, no cache — kept separate from thoughtLeadershipScore.ts so it's
// importable from a plain Vitest/Node test without transitively pulling in
// cache.ts's top-level Deno.env.get() calls.
//
// 25×posts/peer-max + 5×byline% + 15×news/peer-max.
//
// postsCount/newsCount feed a LIVE peer-group max (peerMaxFor reads other
// published audits), same poisoning risk as Social self-report — a scraped
// page returning a degenerate item list would otherwise inflate the max
// for the whole peer group permanently. Cap both at a generous ceiling.
export interface ContentItem {
  title: string;
  date: string;
  type: "blog" | "news" | "other";
  hasNamedByline: boolean;
}

export interface ContentAggregate {
  postsCount: number;
  newsCount: number;
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
  const posts = itemsInWindow.filter((it) => it.type === "blog");
  const news = itemsInWindow.filter((it) => it.type === "news");
  const bylined = posts.filter((it) => it.hasNamedByline);

  const postsCount = Math.min(posts.length, MAX_ITEMS_PER_CATEGORY);
  const newsCount = Math.min(news.length, MAX_ITEMS_PER_CATEGORY);
  const bylinePct = posts.length > 0 ? bylined.length / posts.length : 0;

  return { postsCount, newsCount, bylinePct };
}

export function calculateThoughtLeadershipScore(
  postsCount: number,
  newsCount: number,
  bylinePct: number,
  postsPeerMax: number,
  newsPeerMax: number,
): number {
  const postsScore = postsPeerMax > 0 ? 25 * (postsCount / postsPeerMax) : 0;
  const bylineScore = 5 * bylinePct;
  const newsScore = newsPeerMax > 0 ? 15 * (newsCount / newsPeerMax) : 0;

  return Math.round((postsScore + bylineScore + newsScore) * 100) / 100;
}
