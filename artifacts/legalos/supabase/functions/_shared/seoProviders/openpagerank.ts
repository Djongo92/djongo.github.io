// Open PageRank adapter — the free budget option (1,000 requests/day free
// tier as of this writing; verify current limits before relying on it).
// Only exposes one metric: a 0-10 "page rank decimal" roughly analogous to
// Ahrefs DR / Moz DA, rescaled ×10 here for rough comparability with the
// other providers' 0-100 scale. No referring-domains, backlink-count,
// organic-traffic, organic-keyword, or page-level data exists in this API —
// those come back null, not estimated.
//
// This means a firm scored via Open PageRank alone only has 1 of 6 SEO
// metrics measured. seoFormula.ts rescales the category to whatever subset
// is actually available (10 pts × that one ratio → up to the full 60 if
// it's at the peer group's 90th percentile) rather than silently zero-
// filling the other 5 as if they were earned zeros — the same "no
// fabricated total from a missing input" principle CLAUDE.md states for
// whole categories, applied one level down within this one.
//
// IMPORTANT: same caveat as the other adapters — field names follow Open
// PageRank's publicly documented API, never run against a live key.
import type { NormalizedSeoMetrics, SeoProvider } from "./types.ts";

const ENDPOINT = "https://openpagerank.com/api/v1.0/getPageRank";

interface OpenPageRankResponse {
  response?: { domain: string; page_rank_decimal?: number }[];
}

export class OpenPageRankProvider implements SeoProvider {
  name = "openpagerank" as const;
  constructor(private apiKey: string) {}

  async fetchMetrics(domain: string): Promise<NormalizedSeoMetrics | null> {
    try {
      const url = new URL(ENDPOINT);
      url.searchParams.append("domains[]", domain);
      const resp = await fetch(url.toString(), { headers: { "API-OPR": this.apiKey } });
      if (!resp.ok) {
        console.warn(`[openpagerank] getPageRank returned ${resp.status}`);
        return null;
      }
      const data = (await resp.json()) as OpenPageRankResponse;
      const entry = data.response?.[0];
      if (!entry || typeof entry.page_rank_decimal !== "number") return null;

      return {
        domainAuthority: entry.page_rank_decimal * 10,
        referringDomains: null,
        backlinks: null,
        organicTraffic: null,
        organicKeywords: null,
        pageAuthority: null,
      };
    } catch (e) {
      console.error("[openpagerank] fetchMetrics failed:", e);
      return null;
    }
  }
}
