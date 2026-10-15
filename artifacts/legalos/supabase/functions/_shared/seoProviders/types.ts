// Vendor-agnostic contract for the SEO & Authority category's data source.
// The scoring math (seoFormula.ts / seoScore.ts) only ever talks to this
// shape — swapping Ahrefs for Moz, DataForSEO, or Open PageRank means
// writing one adapter file, never touching the formula or the orchestrator.
//
// Six metrics, chosen to avoid double-counting a vendor's own headline
// number twice and to separate "how big is the link profile" from "does it
// actually convert to search visibility" from "is the specific page a
// prospect lands on any good":
//   domainAuthority   — overall backlink-authority score (Ahrefs DR / Moz DA), 0-100 scale
//   referringDomains  — breadth: how many distinct sites link in
//   backlinks         — depth: total backlink count (can be inflated by a few big linkers)
//   organicTraffic    — estimated monthly organic search visits
//   organicKeywords   — breadth of search footprint: how many terms rank at all
//   pageAuthority     — homepage-specific authority (Ahrefs UR / Moz PA) — domain-level
//                       metrics can mask a weak homepage, this catches that
//
// A field is `null` when the configured provider doesn't expose that metric
// at all (e.g. Open PageRank only has one field) — never fabricated, never
// silently defaulted to 0. seoFormula.ts rescales to whatever subset is
// actually available rather than treating missing metrics as earned zeros.
export interface NormalizedSeoMetrics {
  domainAuthority: number | null;
  referringDomains: number | null;
  backlinks: number | null;
  organicTraffic: number | null;
  organicKeywords: number | null;
  pageAuthority: number | null;
}

export type SeoProviderName = "ahrefs" | "moz" | "dataforseo" | "openpagerank";

export interface SeoProvider {
  name: SeoProviderName;
  /** Returns null (not a zeroed object) on any fetch/parse failure — a
   *  vendor outage should degrade this one audit's SEO category to
   *  "not_configured", not throw and fail every other category too. */
  fetchMetrics(domain: string): Promise<NormalizedSeoMetrics | null>;
}

export const EMPTY_SEO_METRICS: NormalizedSeoMetrics = {
  domainAuthority: null,
  referringDomains: null,
  backlinks: null,
  organicTraffic: null,
  organicKeywords: null,
  pageAuthority: null,
};
