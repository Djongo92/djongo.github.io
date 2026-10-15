// DataForSEO adapter — the cheaper, usage-based alternative to Ahrefs/Moz
// (resells comparable backlink/SERP data at a fraction of Ahrefs' own API
// cost). Two separate DataForSEO products cover the six metrics: the
// Backlinks API (rank/referring domains/backlinks) and DataForSEO Labs
// (estimated organic traffic + ranked-keyword count) — fetched in parallel.
//
// Verified against a live DataForSEO account on 2026-08-13 (two doc drifts
// found and corrected — see the comment above the Labs result type). The
// Ahrefs/Moz adapters in this directory are still docs-only, never run live.
//
// DataForSEO's own "rank" field is on a 0-1000 scale, not Ahrefs
// DR/Moz DA's 0-100 — rescaled here (÷10) so a domainAuthority value is at
// least roughly comparable if a peer group ever mixes providers. Don't
// assume this makes cross-provider comparisons exact; it only prevents an
// obviously-wrong 10x scale mismatch.
import type { NormalizedSeoMetrics, SeoProvider } from "./types.ts";

const BACKLINKS_ENDPOINT = "https://api.dataforseo.com/v3/backlinks/summary/live";
const LABS_ENDPOINT = "https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live";

interface DataForSeoBacklinksResult {
  rank?: number;
  referring_domains?: number;
  backlinks?: number;
}

// Verified against the live API (2026-08-13): domain_rank_overview rejects
// `language_code` as an invalid field (40501), and the metrics are nested
// one level deeper than the docs suggest — result[0].items[0].metrics.organic,
// not result[0].metrics.organic.
interface DataForSeoLabsResult {
  items?: { metrics?: { organic?: { etv?: number; count?: number } } }[];
}

async function dataForSeoPost<T>(endpoint: string, auth: string, body: unknown): Promise<T | null> {
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    console.warn(`[dataforseo] ${endpoint} returned ${resp.status}`);
    return null;
  }
  return (await resp.json()) as T;
}

export class DataForSeoProvider implements SeoProvider {
  name = "dataforseo" as const;
  constructor(private login: string, private password: string) {}

  async fetchMetrics(domain: string): Promise<NormalizedSeoMetrics | null> {
    try {
      const auth = btoa(`${this.login}:${this.password}`);
      const [backlinksResp, labsResp] = await Promise.all([
        dataForSeoPost<{ tasks?: { result?: DataForSeoBacklinksResult[] }[] }>(
          BACKLINKS_ENDPOINT, auth, [{ target: domain }],
        ),
        dataForSeoPost<{ tasks?: { result?: DataForSeoLabsResult[] }[] }>(
          LABS_ENDPOINT, auth, [{ target: domain, location_code: 2688 }],
        ),
      ]);

      const backlinks = backlinksResp?.tasks?.[0]?.result?.[0];
      const labsMetrics = labsResp?.tasks?.[0]?.result?.[0]?.items?.[0]?.metrics;
      if (!backlinks && !labsMetrics) return null;

      return {
        domainAuthority: typeof backlinks?.rank === "number" ? backlinks.rank / 10 : null,
        referringDomains: typeof backlinks?.referring_domains === "number" ? backlinks.referring_domains : null,
        backlinks: typeof backlinks?.backlinks === "number" ? backlinks.backlinks : null,
        organicTraffic: typeof labsMetrics?.organic?.etv === "number" ? labsMetrics.organic.etv : null,
        organicKeywords: typeof labsMetrics?.organic?.count === "number" ? labsMetrics.organic.count : null,
        // DataForSEO's Backlinks/Labs APIs report at domain level only —
        // no distinct homepage-specific authority field the way Ahrefs (UR)
        // and Moz (PA) expose one.
        pageAuthority: null,
      };
    } catch (e) {
      console.error("[dataforseo] fetchMetrics failed:", e);
      return null;
    }
  }
}
