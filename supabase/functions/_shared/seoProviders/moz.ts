// Moz Links API (v2) adapter.
//
// IMPORTANT: same caveat as ahrefs.ts — field names follow Moz's publicly
// documented Links API v2 shape, never verified against a live account
// (MOZ_API_KEY is a hard-stop secret per CLAUDE.md, not present here).
// Verify against a real account before relying on this.
//
// Moz's Links API doesn't expose organic traffic or ranked-keyword counts
// at all (that's Moz Pro dashboard territory, not this API) — those two
// fields come back null from this provider. A firm scored via Moz alone
// gets a real, peer-normalized number from 4 of the 6 metrics, not a
// fabricated estimate for the other 2 — seoFormula.ts rescales to whatever
// subset is actually available.
import type { NormalizedSeoMetrics, SeoProvider } from "./types.ts";

const ENDPOINT = "https://lsapi.seomoz.com/v2/url_metrics";

interface MozUrlMetrics {
  domain_authority?: number;
  page_authority?: number;
  root_domains_to_root_domain?: number;
  external_pages_to_root_domain?: number;
}

export class MozProvider implements SeoProvider {
  name = "moz" as const;
  constructor(private accessId: string, private secretKey: string) {}

  async fetchMetrics(domain: string): Promise<NormalizedSeoMetrics | null> {
    try {
      const auth = btoa(`${this.accessId}:${this.secretKey}`);
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targets: [domain] }),
      });
      if (!resp.ok) {
        console.warn(`[moz] url_metrics returned ${resp.status}`);
        return null;
      }
      const data = (await resp.json()) as { results?: MozUrlMetrics[] };
      const m = data.results?.[0];
      if (!m) return null;

      return {
        domainAuthority: typeof m.domain_authority === "number" ? m.domain_authority : null,
        referringDomains: typeof m.root_domains_to_root_domain === "number" ? m.root_domains_to_root_domain : null,
        backlinks: typeof m.external_pages_to_root_domain === "number" ? m.external_pages_to_root_domain : null,
        organicTraffic: null,
        organicKeywords: null,
        pageAuthority: typeof m.page_authority === "number" ? m.page_authority : null,
      };
    } catch (e) {
      console.error("[moz] fetchMetrics failed:", e);
      return null;
    }
  }
}
