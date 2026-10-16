// Pure config + logic for regional legal trade-press sources. No Deno
// globals, no network — the fetch half lives in pressMentions.ts, same
// split as pressMentionsFormula.ts.
//
// Why this exists: SeeNews, bizlife.rs and similar
// regional trade outlets are barely indexed in a plain Google News query —
// a quoted RSS search for a covered firm returns only years-old items
// despite known recent coverage. Each outlet here is queried through a
// structured strategy that actually reaches its archive:
//
// - "wp-search-rss": the outlet is WordPress and its search RSS honours
//   quoted-phrase matching (verified: a nonsense phrase returns 0 items),
//   so we hit `?s="<firm>"&feed=rss2` directly.
// - "google-news-site": the outlet blocks server-side fetches (Cloudflare
//   challenge) or renders results client-side only, but a SITE-SCOPED
//   Google News query (`"<firm>" site:<domain>`) surfaces its recent items
//   that the plain unscoped query misses.
import type { RawRssItem } from "./pressMentionsFormula.ts";

export interface TradeOutlet {
  id: string;
  /** Bare hostname; also used as the mention's source attribution. */
  domain: string;
  strategy: "wp-search-rss" | "google-news-site";
}

export const REGIONAL_TRADE_OUTLETS: TradeOutlet[] = [
  // Next.js client-rendered search, no public search feed — site-scoped GN.
  { id: "seenews", domain: "seenews.com", strategy: "google-news-site" },
  // WordPress; quoted search RSS verified phrase-exact.
  { id: "bizlife", domain: "bizlife.rs", strategy: "wp-search-rss" },
  // WordPress; quoted search RSS verified phrase-exact (nonsense + scrambled
  // real-word controls return 0 items; real firm phrases return hits).
  { id: "novaekonomija", domain: "novaekonomija.rs", strategy: "wp-search-rss" },
  // WordPress; apex 301s to www (fetch follows) — quoted search RSS verified
  // phrase-exact on www.danas.rs with the same controls.
  { id: "danas", domain: "danas.rs", strategy: "wp-search-rss" },
  // Cloudflare-challenged for non-browser fetches (403 "Just a moment…") —
  // site-scoped GN only; scoped queries return firm items the plain query misses.
  { id: "ekapija", domain: "ekapija.com", strategy: "google-news-site" },
];

export function buildOutletUrl(outlet: TradeOutlet, firmName: string): string {
  const quoted = `"${firmName.trim()}"`;
  switch (outlet.strategy) {
    case "wp-search-rss":
      return `https://${outlet.domain}/?s=${encodeURIComponent(quoted)}&feed=rss2`;
    case "google-news-site":
      return `https://news.google.com/rss/search?q=${encodeURIComponent(`${quoted} site:${outlet.domain}`)}&hl=en-US&gl=US&ceid=US:en`;
  }
}

/**
 * Direct outlet feeds (WordPress search RSS) carry no per-item
 * `<source url>` — stamp the outlet's own domain in so downstream
 * filtering/attribution treats these items exactly like Google News ones.
 * Items that already carry a source (google-news-site strategy) keep it.
 */
export function withOutletSource(items: RawRssItem[], outlet: TradeOutlet): RawRssItem[] {
  return items.map((it) => (it.sourceUrl ? it : { ...it, sourceUrl: `https://${outlet.domain}` }));
}
