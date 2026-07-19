// Shared "live peer-group maximum" lookup for categories whose peer-max has
// no static reference table (Thought Leadership, Social) — unlike
// Reputation, which draws its peer set from market_directory_data instead.
// Queries other published audits sharing market+peer_group and reads one
// metric out of a named sub-object of their raw_metrics jsonb.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function peerMaxFor(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  market: string,
  peerGroup: string,
  categoryKey: string,
  metric: string,
  ownValue: number,
): Promise<number> {
  const { data, error } = await serviceClient
    .from("market_visibility_audits")
    .select("raw_metrics")
    .eq("market", market)
    .eq("peer_group", peerGroup)
    .eq("is_public", true);

  if (error || !data) return ownValue;

  let max = ownValue;
  for (const row of data as { raw_metrics: Record<string, unknown> }[]) {
    const category = row.raw_metrics?.[categoryKey] as Record<string, unknown> | undefined;
    const v = category?.[metric];
    if (typeof v === "number" && v > max) max = v;
  }
  return max;
}
