// Performance category (20 pts): PSI Lighthouse, desktop + mobile.
// 10×(desktop+mobile perf avg)/100 + 5×(access avg)/100 + 5×(seo avg)/100.
//
// PAGESPEED_API_KEY is a hard-stop secret per CLAUDE.md — it's a free
// Google API key but isn't present in Supabase secrets yet. This degrades
// gracefully rather than failing the audit: no key → provenance "missing",
// score 0, and the rest of the audit still completes.
import { getCached, setCached } from "./cache.ts";

export interface PerformanceResult {
  score: number;
  raw: Record<string, unknown>;
  provenance: "api" | "missing";
}

interface LighthouseCategories {
  performance: number;
  accessibility: number;
  seo: number;
}

async function runPsi(url: string, strategy: "desktop" | "mobile", apiKey: string): Promise<LighthouseCategories> {
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=seo&key=${apiKey}`;
  const resp = await fetch(endpoint, { signal: AbortSignal.timeout(25000) });
  if (!resp.ok) throw new Error(`PSI ${strategy} HTTP ${resp.status}`);
  const data = await resp.json();
  const cats = data?.lighthouseResult?.categories;
  return {
    performance: Math.round((cats?.performance?.score ?? 0) * 100),
    accessibility: Math.round((cats?.accessibility?.score ?? 0) * 100),
    seo: Math.round((cats?.seo?.score ?? 0) * 100),
  };
}

export async function computePerformanceScore(normalizedUrl: string): Promise<PerformanceResult> {
  const apiKey = Deno.env.get("PAGESPEED_API_KEY");
  if (!apiKey) {
    console.warn("[visibility-audit-performance] PAGESPEED_API_KEY not configured — scoring as missing");
    return { score: 0, raw: {}, provenance: "missing" };
  }

  const cached = await getCached("visibility-audit-performance", normalizedUrl);
  if (cached.hit) return cached.hit as PerformanceResult;

  try {
    const [desktop, mobile] = await Promise.all([
      runPsi(normalizedUrl, "desktop", apiKey),
      runPsi(normalizedUrl, "mobile", apiKey),
    ]);

    const perfAvg = (desktop.performance + mobile.performance) / 2;
    const accessAvg = (desktop.accessibility + mobile.accessibility) / 2;
    const seoAvg = (desktop.seo + mobile.seo) / 2;

    const score = Math.round((10 * (perfAvg / 100) + 5 * (accessAvg / 100) + 5 * (seoAvg / 100)) * 100) / 100;

    const result: PerformanceResult = {
      score,
      raw: { desktop, mobile, perfAvg, accessAvg, seoAvg },
      provenance: "api",
    };
    await setCached(cached.key, "visibility-audit-performance", normalizedUrl, result);
    return result;
  } catch (e) {
    console.error("[visibility-audit-performance] PSI call failed:", e);
    return { score: 0, raw: {}, provenance: "missing" };
  }
}
