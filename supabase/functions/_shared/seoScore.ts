// SEO & Authority category (60 pts): six metrics, each peer-normalized via
// p90Ratio (see percentileFormula.ts), sourced from whichever provider is
// configured in Supabase secrets (see seoProviders/ — Ahrefs, Moz,
// DataForSEO, or the free Open PageRank tier). Degrades to
// "not_configured" when no provider key exists, and to a rescaled partial
// score (see seoFormula.ts) when the configured provider only exposes a
// subset of the six metrics — never a fabricated total, never a silent
// zero for something that was never actually measured.
//
// AHREFS_API_KEY / MOZ_API_KEY (or the DataForSEO / Open PageRank
// equivalents below) are hard-stop secrets per CLAUDE.md — none are present
// in this project's Supabase secrets, so this always returns
// "not_configured" today. The moment any one of them is added, this starts
// producing real, peer-normalized scores with no further code changes.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { peerStatsFor } from "./peerStats.ts";
import { p90Ratio, type PeerStats } from "./percentileFormula.ts";
import { calculateSeoScore } from "./seoFormula.ts";
import { getConfiguredSeoProvider, type NormalizedSeoMetrics, type SeoProviderName } from "./seoProviders/index.ts";
import type { FirmSize } from "./peerDimensions.ts";

export interface SeoResult {
  score: number;
  raw: Record<string, unknown>;
  provenance: "api" | "missing";
  status: "not_configured" | "api";
}

const SEO_METRICS = [
  "domainAuthority",
  "referringDomains",
  "backlinks",
  "organicTraffic",
  "organicKeywords",
  "pageAuthority",
] as const satisfies readonly (keyof NormalizedSeoMetrics)[];

export async function computeSeoAuthorityScore(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  market: string,
  peerGroup: string,
  auditedDomain: string,
  firmSize?: FirmSize | null,
): Promise<SeoResult> {
  const provider = getConfiguredSeoProvider();
  if (!provider) {
    return { score: 0, raw: {}, provenance: "missing", status: "not_configured" };
  }

  const metrics = await provider.fetchMetrics(auditedDomain);
  if (!metrics) {
    // Vendor outage, unrecognized domain, or a transient failure — degrade
    // this one category, don't fail the whole audit.
    return { score: 0, raw: { provider: provider.name }, provenance: "missing", status: "not_configured" };
  }

  const statsEntries = await Promise.all(
    SEO_METRICS.map(async (metric): Promise<[typeof metric, PeerStats | null]> => {
      const value = metrics[metric];
      if (value === null) return [metric, null];
      const stats = await peerStatsFor(serviceClient, market, peerGroup, "seoAuthority", metric, value, auditedDomain, firmSize);
      return [metric, stats];
    }),
  );

  const statsByMetric = Object.fromEntries(statsEntries) as Record<typeof SEO_METRICS[number], PeerStats | null>;
  const ratios = SEO_METRICS.map((m) => (statsByMetric[m] ? p90Ratio(statsByMetric[m]!) : null));
  const { score, metricsAvailable, metricsTotal } = calculateSeoScore(ratios);

  // A 200 response with every mapped field null (an odd but real vendor
  // failure mode — a domain the provider genuinely has no data for, say)
  // is functionally a missing measurement, not a real "0" — same rule as
  // the !metrics bail above.
  if (metricsAvailable === 0) {
    return { score: 0, raw: { provider: provider.name }, provenance: "missing", status: "not_configured" };
  }

  return {
    score,
    // Every metric's full peer-stats record persisted (not just the
    // blended score), same rationale as socialScore.ts: a client can
    // re-derive this exact number later, and a managing partner can audit
    // it instead of just arguing with it. provider/metricsAvailable make
    // it plain which of the six were actually measured for this firm.
    raw: {
      provider: provider.name as SeoProviderName,
      metricsAvailable,
      metricsTotal,
      ...statsByMetric,
    },
    provenance: "api",
    status: "api",
  };
}
