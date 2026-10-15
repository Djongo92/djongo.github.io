// Single shared implementation of the desktop-first PSI host-variant
// fallback, used by both the live-audit path (performanceScore.ts) and the
// weekly warm-cache refresh (firm-signals-refresh/psiSignalRefresh.ts).
// These were previously two parallel copies kept in sync only by comment —
// any policy change now happens here, once.
//
// Policy:
//   * desktop-first across both host variants (law-firm sites are desktop
//     properties; Lighthouse's mobile UA is what bot protection rejects)
//   * mobile is a best-effort refinement attempted only after
//   * single-strategy substitution is flagged honestly (mobileFromDesktop /
//     desktopFromMobile) and the succeeding host is recorded — peerStatsFor
//     excludes flagged categories from peer aggregates so estimated numerics
//     never enter anyone else's benchmark
//   * all-four-fail returns null; each caller decides what that means
//     (live path: provenance "missing"; refresh: advisory is_unverifiable —
//     see .agents/memory/advisory-negative-cache.md)
//
// Must stay import-safe: no env reads, no network, no serve at module scope.
import type { LighthouseCategories } from "./performanceFormula.ts";
import { homepageVariants } from "./hostVariants.ts";

export interface PsiFetchOptions {
  /** Per-request timeout in ms. Live audits use 25s; batch paths (census
   *  90s, weekly refresh 60s) pass more so slow sites aren't misrecorded. */
  timeoutMs?: number;
  /** Total budget across ALL attempts in ms. A per-request timeout alone
   *  permits up to 4x timeoutMs of sequential PSI work — enough to exceed
   *  the edge/cron wall-clock budget — so batch callers must also set this
   *  aggregate cap. Once the remaining budget can't fund a meaningful
   *  attempt, the rest of the matrix is skipped. */
  deadlineMs?: number;
  /** Prefix for warn logs, e.g. "[firm-signals-refresh]". */
  logPrefix?: string;
}

export interface PsiFetchResult {
  /** Desktop categories — substituted from mobile when desktopFromMobile. */
  desktop: LighthouseCategories;
  /** Mobile categories — substituted from desktop when mobileFromDesktop. */
  mobile: LighthouseCategories;
  /** Which host variant each strategy actually succeeded on — www and bare
   * can serve different content, so the audit trail needs the source. */
  hosts: { desktop?: string; mobile?: string };
  /** Set when desktop failed on both hosts and mobile's categories were reused. */
  desktopFromMobile?: boolean;
  /** Set when mobile failed on both hosts and desktop's categories were reused. */
  mobileFromDesktop?: boolean;
}

async function runPsi(
  url: string,
  strategy: "desktop" | "mobile",
  apiKey: string,
  timeoutMs: number,
  logPrefix: string,
): Promise<LighthouseCategories | null> {
  try {
    // The fields mask is LOAD-BEARING: we consume only the three category
    // scores, but a full Lighthouse response is multi-MB (audits, screenshots,
    // trace details). Buffering several of those concurrently in the edge
    // isolate is what OOM-killed the weekly signals sweep at ~90-firm scale
    // (WORKER_RESOURCE_LIMIT, deterministic at the same frontier firm).
    // fields=lighthouseResult/categories shrinks the payload to bytes. Do not
    // remove it; the Deno test below pins it.
    const endpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=seo&fields=${encodeURIComponent("lighthouseResult/categories")}&key=${apiKey}`;
    const resp = await fetch(endpoint, { signal: AbortSignal.timeout(timeoutMs) });
    if (!resp.ok) {
      console.warn(`${logPrefix} PSI ${strategy} HTTP ${resp.status} for ${url}`);
      return null;
    }
    const data = await resp.json() as { lighthouseResult?: { categories?: Record<string, { score: number }> } };
    const cats = data?.lighthouseResult?.categories;
    return {
      performance: Math.round((cats?.performance?.score ?? 0) * 100),
      accessibility: Math.round((cats?.accessibility?.score ?? 0) * 100),
      seo: Math.round((cats?.seo?.score ?? 0) * 100),
    };
  } catch (e) {
    console.warn(`${logPrefix} PSI ${strategy} failed for ${url}:`, e);
    return null;
  }
}

/**
 * Runs the full 2-hosts × 2-strategies PSI fallback matrix for a site.
 * Returns categories for both strategies (with honest substitution flags
 * when only one strategy succeeded), or null when all four attempts failed.
 */
export async function psiFetchWithFallback(
  siteUrl: string,
  apiKey: string,
  options: PsiFetchOptions = {},
): Promise<PsiFetchResult | null> {
  const timeoutMs = options.timeoutMs ?? 25000;
  const logPrefix = options.logPrefix ?? "[psi-fetch]";

  let desktop: LighthouseCategories | null = null;
  let mobile: LighthouseCategories | null = null;
  const hosts: { desktop?: string; mobile?: string } = {};

  const startedAt = Date.now();
  const MIN_ATTEMPT_MS = 5000;
  /** Remaining aggregate budget for the next attempt, or null when the
   *  deadline can no longer fund a meaningful PSI call. */
  const attemptBudget = (): number | null => {
    if (options.deadlineMs == null) return timeoutMs;
    const remaining = options.deadlineMs - (Date.now() - startedAt);
    return remaining < MIN_ATTEMPT_MS ? null : Math.min(timeoutMs, remaining);
  };

  for (const variant of homepageVariants(siteUrl)) {
    const budget = attemptBudget();
    if (budget === null) break;
    desktop = await runPsi(variant, "desktop", apiKey, budget, logPrefix);
    if (desktop) {
      hosts.desktop = variant;
      break;
    }
  }
  for (const variant of homepageVariants(siteUrl)) {
    const budget = attemptBudget();
    if (budget === null) break;
    mobile = await runPsi(variant, "mobile", apiKey, budget, logPrefix);
    if (mobile) {
      hosts.mobile = variant;
      break;
    }
  }

  if (!desktop && !mobile) return null;

  // One-strategy fallback: reuse the successful strategy's categories so the
  // averages still work; flag the substitution for honesty. Policy (decided
  // after code review): keep-and-mark. With only one strategy measured,
  // averaging the duplicated categories is identical to scoring from the sole
  // real measurement — reweighting can't recover the missing strategy, and a
  // penalty would punish the firm for a PSI/bot-protection artifact.
  return {
    desktop: desktop ?? mobile!,
    mobile: mobile ?? desktop!,
    hosts,
    ...(!desktop ? { desktopFromMobile: true } : {}),
    ...(!mobile ? { mobileFromDesktop: true } : {}),
  };
}
