// DataForSEO adapter — the cheaper, usage-based alternative to Ahrefs/Moz
// (resells comparable backlink/SERP data at a fraction of Ahrefs' own API
// cost). Two separate DataForSEO products cover the six metrics: the
// Backlinks API (rank/referring domains/backlinks) and DataForSEO Labs
// (estimated organic traffic + ranked-keyword count) — fetched in parallel.
//
// IMPORTANT: same caveat as ahrefs.ts/moz.ts — endpoint paths, request
// shape, and the deeply-nested response paths below follow DataForSEO's
// publicly documented v3 API, never run against a live account. DataForSEO's
// actual response nesting is notoriously deep and has shifted between API
// versions — verify the exact path before relying on this.
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

interface DataForSeoLabsResult {
  metrics?: { organic?: { etv?: number; count?: number } };
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
          LABS_ENDPOINT, auth, [{ target: domain, location_code: 2688, language_code: "en" }],
        ),
      ]);

      const backlinks = backlinksResp?.tasks?.[0]?.result?.[0];
      const labs = labsResp?.tasks?.[0]?.result?.[0];
      if (!backlinks && !labs) return null;

      return {
        domainAuthority: typeof backlinks?.rank === "number" ? backlinks.rank / 10 : null,
        referringDomains: typeof backlinks?.referring_domains === "number" ? backlinks.referring_domains : null,
        backlinks: typeof backlinks?.backlinks === "number" ? backlinks.backlinks : null,
        organicTraffic: typeof labs?.metrics?.organic?.etv === "number" ? labs.metrics.organic.etv : null,
        organicKeywords: typeof labs?.metrics?.organic?.count === "number" ? labs.metrics.organic.count : null,
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
