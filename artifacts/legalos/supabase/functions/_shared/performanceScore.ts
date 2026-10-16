// Website Experience category (50 pts — weights in methodology.ts): PSI
// Lighthouse performance, accessibility, and SEO, desktop + mobile averaged.
//
// PAGESPEED_API_KEY is a hard-stop secret per CLAUDE.md — it's a free
// Google API key but isn't present in Supabase secrets yet. This degrades
// gracefully rather than failing the audit: no key → provenance "missing",
// score 0, and the rest of the audit still completes.
//
// Warm-cache path: firm-signals-refresh pre-fetches PSI weekly for every
// benchmark firm and stores results in firm_signals. If a fresh row exists
// for this domain we use it directly, avoiding a live PSI call during the
// audit and making audits faster for firms in the benchmark set.
import { getCached, setCached } from "./cache.ts";
import { calculatePerformanceScore, type LighthouseCategories } from "./performanceFormula.ts";
import { getFirmSignal, makeServiceClient, normalizeDomain } from "./firmSignals.ts";
import { psiFetchWithFallback } from "./psiFetchWithFallback.ts";

export interface PerformanceResult {
  score: number;
  raw: Record<string, unknown>;
  provenance: "api" | "missing";
}

export async function computePerformanceScore(
  normalizedUrl: string,
  options?: { timeoutMs?: number; deadlineMs?: number },
): Promise<PerformanceResult> {
  // 1. Check the firm_signals warm cache (populated by firm-signals-refresh).
  //    If the weekly job already ran PSI for this domain, reuse it.
  const domain = normalizeDomain(normalizedUrl);
  if (domain) {
    try {
      const serviceClient = makeServiceClient();
      const cached = await getFirmSignal(serviceClient, domain, "pagespeed");
      if (cached) {
        if (cached.is_unverifiable) {
          // Advisory only: the weekly job marks a site unverifiable after all
          // attempts fail, but that failure may be transient (a Google outage
          // shouldn't block scoring for a week). Fall through and try live
          // PSI instead of short-circuiting to "missing".
          console.warn(`[visibility-audit-performance] firm_signals flags ${domain} as unverifiable — attempting live PSI anyway`);
        } else {
          // payload shape: { desktop, mobile, perfAvg, accessAvg, seoAvg, score,
          //   plus honesty metadata from the refresh job's fallback logic }
          const { score, desktop, mobile, perfAvg, accessAvg, seoAvg, desktopFromMobile, mobileFromDesktop, hosts } = cached.payload as {
            score: number;
            desktop: LighthouseCategories;
            mobile: LighthouseCategories;
            perfAvg: number;
            accessAvg: number;
            seoAvg: number;
            desktopFromMobile?: boolean;
            mobileFromDesktop?: boolean;
            hosts?: { desktop?: string; mobile?: string };
          };
          if (typeof score === "number" && desktop && mobile) {
            return {
              score,
              raw: {
                desktop, mobile, perfAvg, accessAvg, seoAvg, source: "firm_signals",
                ...(desktopFromMobile ? { desktopFromMobile: true } : {}),
                ...(mobileFromDesktop ? { mobileFromDesktop: true } : {}),
                ...(hosts ? { hosts } : {}),
              },
              provenance: "api",
            };
          }
        }
      }
    } catch (e) {
      console.warn("[visibility-audit-performance] firm_signals lookup failed, falling through to live PSI:", e);
    }
  }

  // 2. No warm cache — fall back to the live PSI call.
  const apiKey = Deno.env.get("PAGESPEED_API_KEY");
  if (!apiKey) {
    console.warn("[visibility-audit-performance] PAGESPEED_API_KEY not configured — scoring as missing");
    return { score: 0, raw: {}, provenance: "missing" };
  }

  const urlCached = await getCached("visibility-audit-performance", normalizedUrl);
  if (urlCached.hit) return urlCached.hit as PerformanceResult;

  try {
    // Desktop-first host-variant fallback, shared with the warm-cache
    // refresh job — see _shared/psiFetchWithFallback.ts for the policy
    // (ordering, single-strategy keep-and-mark substitution, host recording).
    const psi = await psiFetchWithFallback(normalizedUrl, apiKey, {
      // Live user-facing audits keep the fast 25s budget; internal batch
      // paths (census, weekly refresh) pass a larger one — slow-but-working
      // firm sites (60s+ Lighthouse runs) must not score as missing. Batch
      // callers must also pass deadlineMs so worst-case sequential attempts
      // stay inside the edge/cron wall-clock budget.
      timeoutMs: options?.timeoutMs ?? 25000,
      deadlineMs: options?.deadlineMs,
      logPrefix: "[visibility-audit-performance]",
    });
    if (!psi) {
      throw new Error("PSI failed for every host variant and strategy");
    }

    const { desktop, mobile, hosts, desktopFromMobile, mobileFromDesktop } = psi;
    const { score, perfAvg, accessAvg, seoAvg } = calculatePerformanceScore(desktop, mobile);

    const result: PerformanceResult = {
      score,
      raw: {
        desktop,
        mobile,
        perfAvg,
        accessAvg,
        seoAvg,
        hosts,
        ...(desktopFromMobile ? { desktopFromMobile: true } : {}),
        ...(mobileFromDesktop ? { mobileFromDesktop: true } : {}),
      },
      provenance: "api",
    };
    await setCached(urlCached.key, "visibility-audit-performance", normalizedUrl, result);
    return result;
  } catch (e) {
    console.error("[visibility-audit-performance] PSI call failed:", e);
    return { score: 0, raw: {}, provenance: "missing" };
  }
}
