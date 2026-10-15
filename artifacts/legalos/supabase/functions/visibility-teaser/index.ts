// The one genuinely public, no-password surface in this app (CLAUDE.md
// Decided #1): Performance (real PSI data) + Reputation (GBP self-report +
// real Chambers/Legal 500/IFLR1000 directory match, when a market is given).
// IP-rate-limited instead of access-token-gated — deliberately does NOT call
// requireAccess. The full five-category audit (plus Social and Thought
// Leadership) stays behind the benchmark scope (visibility-audit-run).
//
// The Reputation half costs nothing extra to add here: it's the exact same
// computeReputationScore used by the real audit, reading only static
// directory data — no external paid API, no reason to gate it separately.
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { normalizeUrl } from "../_shared/safeFetch.ts";
import { computePerformanceScore } from "../_shared/performanceScore.ts";
import { computeReputationScore } from "../_shared/reputationScore.ts";
import { clientIpFrom, checkRateLimit } from "../_shared/rateLimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, gbpListed, market, firmName } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const ip = clientIpFrom(req);
    const { allowed, remaining } = await checkRateLimit(serviceClient, ip);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again later, or run the full audit with access." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUrl = normalizeUrl(url);
    const [performance, reputation] = await Promise.all([
      computePerformanceScore(normalizedUrl),
      typeof market === "string" && market
        ? computeReputationScore(serviceClient, market, (firmName as string) || url, gbpListed === true)
        : Promise.resolve(null),
    ]);

    const reputationScore = reputation?.score ?? (gbpListed === true ? 10 : 0);
    const reputationMax = reputation ? 55 : 10;

    return new Response(JSON.stringify({
      url: normalizedUrl,
      performance: { score: performance.score, provenance: performance.provenance },
      reputation: reputation
        ? { score: reputation.score, provenance: reputation.provenance, directory: reputation.directory, matchedFirmName: (reputation.raw as { matchedFirmName?: string }).matchedFirmName }
        : { score: reputationScore, provenance: "self_reported", directory: "pending" },
      teaserTotal: Math.round((performance.score + reputationScore) * 100) / 100,
      teaserMax: 20 + reputationMax,
      remaining,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-teaser error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
