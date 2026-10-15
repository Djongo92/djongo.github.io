// Ahrefs API v3 adapter.
//
// IMPORTANT: endpoint paths and response field names below follow Ahrefs'
// publicly documented API v3 shape at the time this was written. This has
// never been run against a live Ahrefs account or key — none exists in this
// project (AHREFS_API_KEY is a hard-stop secret per CLAUDE.md) — so treat
// the field mapping as a well-informed best guess to verify against a real
// account and Ahrefs' current docs before relying on it, not a tested
// integration. If a field name has drifted, this is the only file that
// needs to change — seoFormula.ts and seoScore.ts never see raw Ahrefs shape.
//
// Ahrefs API v3 is credit/row-based, not a flat subscription — see the cost
// discussion in this project's own notes before enabling.
import type { NormalizedSeoMetrics, SeoProvider } from "./types.ts";

const BASE_URL = "https://api.ahrefs.com/v3";

interface AhrefsMetricsResponse {
  metrics?: {
    domain_rating?: number;
    url_rating?: number;
    refdomains?: number;
    backlinks?: number;
    org_traffic?: number;
    org_keywords?: number;
  };
}

async function ahrefsGet<T>(path: string, apiKey: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!resp.ok) {
    console.warn(`[ahrefs] ${path} returned ${resp.status}`);
    return null;
  }
  return (await resp.json()) as T;
}

export class AhrefsProvider implements SeoProvider {
  name = "ahrefs" as const;
  constructor(private apiKey: string) {}

  async fetchMetrics(domain: string): Promise<NormalizedSeoMetrics | null> {
    try {
      // Domain-level metrics (DR, referring domains, backlinks, organic
      // traffic/keywords) and the homepage's own URL Rating are two
      // separate Ahrefs endpoints in v3 — fetched in parallel since neither
      // depends on the other.
      const [domainResp, urlResp] = await Promise.all([
        ahrefsGet<AhrefsMetricsResponse>("/site-explorer/metrics", this.apiKey, {
          target: domain,
          mode: "domain",
        }),
        ahrefsGet<AhrefsMetricsResponse>("/site-explorer/metrics", this.apiKey, {
          target: domain,
          mode: "exact",
        }),
      ]);
      if (!domainResp) return null;

      const d = domainResp.metrics ?? {};
      const u = urlResp?.metrics ?? {};

      return {
        domainAuthority: typeof d.domain_rating === "number" ? d.domain_rating : null,
        referringDomains: typeof d.refdomains === "number" ? d.refdomains : null,
        backlinks: typeof d.backlinks === "number" ? d.backlinks : null,
        organicTraffic: typeof d.org_traffic === "number" ? d.org_traffic : null,
        organicKeywords: typeof d.org_keywords === "number" ? d.org_keywords : null,
        pageAuthority: typeof u.url_rating === "number" ? u.url_rating : null,
      };
    } catch (e) {
      console.error("[ahrefs] fetchMetrics failed:", e);
      return null;
    }
  }
}
