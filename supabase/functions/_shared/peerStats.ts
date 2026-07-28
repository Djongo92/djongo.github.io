// Live peer-group statistics for categories whose peer comparison set has no
// static reference table (Thought Leadership, Social) — unlike Reputation,
// which draws its peer set from market_directory_data instead. Queries other
// published audits sharing market+peer_group and reads one metric out of a
// named sub-object of their raw_metrics jsonb, then benchmarks against the
// peer group's 90th percentile rather than its raw maximum — see
// percentileFormula.ts for why.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { computePeerStats, MIN_PEER_SAMPLE, type PeerStats } from "./percentileFormula.ts";
import type { FirmSize } from "./peerDimensions.ts";

async function fetchPeerValues(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  market: string,
  peerGroup: string | null,
  categoryKey: string,
  metric: string,
  excludeDomain: string,
  firmSize?: FirmSize | null,
): Promise<number[]> {
  let query = serviceClient
    .from("market_visibility_audits")
    .select("raw_metrics, audited_domain")
    .eq("market", market)
    .eq("is_public", true)
    .neq("audited_domain", excludeDomain);
  if (peerGroup) query = query.eq("peer_group", peerGroup);
  if (firmSize) query = query.eq("firm_size", firmSize);

  const { data, error } = await query;
  if (error || !data) return [];

  const values: number[] = [];
  for (const row of data as { raw_metrics: Record<string, unknown> }[]) {
    const category = row.raw_metrics?.[categoryKey] as Record<string, unknown> | undefined;
    const v = category?.[metric];
    if (typeof v === "number") values.push(v);
  }
  return values;
}

/**
 * Full six-value (plus confidence/widen flags) peer comparison for one
 * metric. Three-tier widening: (1) peer_group + firm_size, the most
 * specific comparison a solo practice's LinkedIn followers shouldn't be
 * benchmarked against an enterprise firm's, and vice versa; (2) peer_group
 * alone, same as before firm_size existed; (3) market-wide. Each tier is
 * tried only if the previous one came up short of MIN_PEER_SAMPLE, and only
 * the market-wide fallback sets `widened` — narrowing to size-and-group is
 * the intended default, not a state worth flagging to the UI the way
 * "we couldn't find your actual peer group" is. firm_size is the only new
 * §7 refinement used to narrow the LIVE peer query (office_count/
 * service_model/specialization/market_tier are captured but not yet used
 * for narrowing — combining multiple simultaneous filters would shrink the
 * candidate pool faster than real audit volume can fill it back in).
 *
 * Excludes `auditedDomain`'s own (possibly stale, previously-published) row
 * from the fetched peer values — the fresh `ownValue` is added back in
 * separately, so leaving the old row in would double-count this firm and
 * inflate the reported sample size.
 */
export async function peerStatsFor(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  market: string,
  peerGroup: string,
  categoryKey: string,
  metric: string,
  ownValue: number,
  auditedDomain: string,
  firmSize?: FirmSize | null,
): Promise<PeerStats> {
  let values = [...(await fetchPeerValues(serviceClient, market, peerGroup, categoryKey, metric, auditedDomain, firmSize)), ownValue];
  let widened = false;

  if (values.length < MIN_PEER_SAMPLE && firmSize) {
    const groupOnly = [...(await fetchPeerValues(serviceClient, market, peerGroup, categoryKey, metric, auditedDomain)), ownValue];
    if (groupOnly.length > values.length) values = groupOnly;
  }

  if (values.length < MIN_PEER_SAMPLE) {
    const marketWide = [...(await fetchPeerValues(serviceClient, market, null, categoryKey, metric, auditedDomain)), ownValue];
    if (marketWide.length > values.length) {
      values = marketWide;
      widened = true;
    }
  }

  return computePeerStats(values, ownValue, { widened });
}
