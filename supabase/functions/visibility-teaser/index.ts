// The one genuinely public, no-password surface in this app (CLAUDE.md
// Decided #1): Performance (real PSI data) + GBP binary (self-reported)
// only. IP-rate-limited instead of access-token-gated — deliberately does
// NOT call requireAccess. The full five-category audit stays behind the
// benchmark scope (visibility-audit-run).
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { normalizeUrl } from "../_shared/safeFetch.ts";
import { computePerformanceScore } from "../_shared/performanceScore.ts";
import { clientIpFrom, checkRateLimit } from "../_shared/rateLimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const GBP_POINTS = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, gbpListed } = await req.json();
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
    const performance = await computePerformanceScore(normalizedUrl);
    const gbpScore = gbpListed === true ? GBP_POINTS : 0;

    return new Response(JSON.stringify({
      url: normalizedUrl,
      performance: { score: performance.score, provenance: performance.provenance },
      gbp: { score: gbpScore },
      teaserTotal: Math.round((performance.score + gbpScore) * 100) / 100,
      teaserMax: 20 + GBP_POINTS,
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
