// PSI warm-cache refresh for one domain, extracted from index.ts so Deno-CI
// tests can exercise the fallback matrix without triggering Deno.serve.
// Must stay import-safe: no env reads, no network, no serve at module scope.
//
// The desktop-first host-variant fallback lives in the shared
// _shared/psiFetchWithFallback.ts module (also used by the live-audit path in
// _shared/performanceScore.ts). This file only decides what to persist:
//   * any success → upsert the scored payload with honesty flags
//   * all-four-fail → upsert is_unverifiable — advisory only, the live path
//     still retries (see .agents/memory/advisory-negative-cache.md)
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { calculatePerformanceScore } from "../_shared/performanceFormula.ts";
import { psiFetchWithFallback } from "../_shared/psiFetchWithFallback.ts";
import { upsertFirmSignal } from "../_shared/firmSignals.ts";
import { PSI_TTL_HOURS } from "./config.ts";

/**
 * Refreshes the pagespeed firm_signal for one domain. Returns "ok" when any
 * strategy succeeded, "failed" when all four attempts (2 hosts × 2
 * strategies) failed and an advisory is_unverifiable row was written.
 */
export async function refreshPsiSignal(
  serviceClient: SupabaseClient,
  domain: string,
  siteUrl: string,
  psiKey: string,
): Promise<"ok" | "failed"> {
  const psi = await psiFetchWithFallback(siteUrl, psiKey, {
    // Weekly batch budget: slow-but-working sites (45-65s Lighthouse runs)
    // must not land in the cache as is_unverifiable — even though negative
    // rows are advisory, every live retry pays the failure again. The
    // deadline caps the aggregate so a worst-case 4-attempt matrix stays
    // inside the cron wall-clock budget.
    timeoutMs: 60000,
    deadlineMs: 120_000,
    logPrefix: "[firm-signals-refresh]",
  });
  if (psi) {
    const { desktop, mobile, hosts, desktopFromMobile, mobileFromDesktop } = psi;
    const { score, perfAvg, accessAvg, seoAvg } = calculatePerformanceScore(desktop, mobile);
    await upsertFirmSignal(
      serviceClient, domain, "pagespeed",
      {
        desktop, mobile, perfAvg, accessAvg, seoAvg, score,
        hosts,
        ...(desktopFromMobile ? { desktopFromMobile: true } : {}),
        ...(mobileFromDesktop ? { mobileFromDesktop: true } : {}),
      },
      PSI_TTL_HOURS, false,
    );
    return "ok";
  }
  await upsertFirmSignal(serviceClient, domain, "pagespeed", {}, PSI_TTL_HOURS, true);
  return "failed";
}
