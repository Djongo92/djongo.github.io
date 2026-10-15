// Pure probe-result logic for the press-outlets-health cron function. No
// Deno globals, no network — the fetch half lives in index.ts, same split as
// regionalTradePressFormula.ts / pressMentions.ts.
import type { RawRssItem } from "../_shared/pressMentionsFormula.ts";

export interface OutletProbe {
  outletId: string;
  ok: boolean;
  itemCount: number;
  httpStatus: number | null;
  error: string | null;
}

/**
 * An item only counts if downstream filtering can use it: a feed returning
 * <item> shells without titles/links would pass a bare length check yet
 * contribute nothing after filterPressMentions (same rule as the vitest
 * smoke). withOutletSource must run BEFORE this so WP-search-RSS items carry
 * their sourceUrl.
 */
export function usableItems(items: RawRssItem[]): RawRssItem[] {
  return items.filter((it) => it.title && it.link && it.sourceUrl);
}

/** Successful HTTP fetch — health is "at least one usable item for a firm with known coverage". */
export function probeFromItems(outletId: string, httpStatus: number, items: RawRssItem[]): OutletProbe {
  const usable = usableItems(items);
  return {
    outletId,
    ok: usable.length > 0,
    itemCount: usable.length,
    httpStatus,
    error: usable.length > 0
      ? null
      : "0 usable items for the known-covered firm — the outlet strategy may have silently broken",
  };
}

export function probeHttpFailure(outletId: string, httpStatus: number): OutletProbe {
  return { outletId, ok: false, itemCount: 0, httpStatus, error: `HTTP ${httpStatus}` };
}

export function probeError(outletId: string, err: unknown): OutletProbe {
  return {
    outletId,
    ok: false,
    itemCount: 0,
    httpStatus: null,
    error: err instanceof Error ? err.message : String(err),
  };
}

/** One failing outlet fails the run (HTTP 500 → visible in cron.job_run_details + edge logs). */
export function summarizeOutletHealth(probes: OutletProbe[]): { ok: boolean; failed: string[] } {
  const failed = probes.filter((p) => !p.ok).map((p) => p.outletId);
  return { ok: failed.length === 0, failed };
}
