// Live peer-group statistics for categories whose peer comparison set has no
// static reference table (Thought Leadership, Social) — unlike Reputation,
// which draws its peer set from market_directory_data instead. Queries other
// published audits sharing market+peer_group and reads one metric out of a
// named sub-object of their raw_metrics jsonb, then benchmarks against the
// peer group's 90th percentile rather than its raw maximum — see
// percentileFormula.ts for why.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { computePeerStats, MIN_PEER_SAMPLE, type PeerStats } from "./percentileFormula.ts";

async function fetchPeerValues(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  market: string,
  peerGroup: string | null,
  categoryKey: string,
  metric: string,
  excludeDomain: string,
): Promise<number[]> {
  let query = serviceClient
    .from("market_visibility_audits")
    .select("raw_metrics, audited_domain")
    .eq("market", market)
    .eq("is_public", true)
    .neq("audited_domain", excludeDomain);
  if (peerGroup) query = query.eq("peer_group", peerGroup);

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
 * metric. Applies the minimum-sample rule: below MIN_PEER_SAMPLE firms in
 * the exact peer group, widens the comparison set to the whole market
 * before falling back to a low-confidence flag on whatever sample remains.
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
): Promise<PeerStats> {
  const scoped = await fetchPeerValues(serviceClient, market, peerGroup, categoryKey, metric, auditedDomain);
  let values = [...scoped, ownValue];
  let widened = false;

  if (values.length < MIN_PEER_SAMPLE) {
    const marketWide = await fetchPeerValues(serviceClient, market, null, categoryKey, metric, auditedDomain);
    const widenedValues = [...marketWide, ownValue];
    if (widenedValues.length > values.length) {
      values = widenedValues;
      widened = true;
    }
  }

  return computePeerStats(values, ownValue, { widened });
}
