import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { normalizeUrl } from "../_shared/safeFetch.ts";
import { computePerformanceScore } from "../_shared/performanceScore.ts";
import { checkSiteHealth } from "../_shared/siteHealth.ts";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUrl = normalizeUrl(url);
    const [result, siteHealth] = await Promise.all([
      computePerformanceScore(normalizedUrl),
      checkSiteHealth(normalizedUrl),
    ]);

    return new Response(JSON.stringify({ ...result, url: normalizedUrl, siteHealth }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-performance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
