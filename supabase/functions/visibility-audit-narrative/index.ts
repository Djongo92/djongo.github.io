// Turns the five category scores + site health into a short, direct
// written synthesis — the "AI Strategy Brief" on the Command Center
// dashboard. This is deliberately an AI opinion layered on top of the
// verified score, not a replacement for it — same posture as
// GlobalAdvisor's "Strategy Advisor" elsewhere in this app (Sparkles icon,
// primary/gold branding, clearly distinct from the emerald "Verified"
// score itself).
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { getCached, setCached } from "../_shared/cache.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";

const corsHeaders = ACCESS_CORS_HEADERS;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { domain, market, peerGroup, totalScore, categories, siteHealthIssues } = await req.json();
    if (!domain || !categories) {
      return new Response(JSON.stringify({ error: "domain and categories are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // getCached/setCached are shaped around real URLs; this isn't one, but
    // shaping the key as a URL-like string keeps it flowing through their
    // normalization cleanly instead of hitting their catch-all fallback path.
    const cacheKey = `https://cache.internal/${encodeURIComponent(domain)}/${market}/${Math.round(totalScore)}`;
    const cached = await getCached("visibility-audit-narrative", cacheKey);
    if (cached.hit) {
      return new Response(JSON.stringify(cached.hit), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const categoryLines = Object.entries(categories as Record<string, { score: number; max: number; provenance: string }>)
      .map(([key, cat]) => `- ${key}: ${cat.score}/${cat.max} (${cat.provenance})`)
      .join("\n");
    const healthLines = (siteHealthIssues as string[] || []).map((i) => `- ${i}`).join("\n") || "(none flagged)";

    const systemPrompt = `You are a sharp, direct marketing strategist reviewing a law firm's externally-verified digital visibility score (peer-group-normalized, five categories, 200 points total). Write a short synthesis connecting the dots across categories — not a restatement of the numbers. Call out the single most consequential pattern (e.g. a category that's actively undermining another, or a strength that isn't being leveraged). No legal-marketing cliches ("trusted advisor", "results-driven"). Confident, specific, a little blunt — like a strategist giving a real read, not a report generator.`;

    const userPrompt = `Domain: ${domain}
Market: ${market} · Peer group: ${peerGroup}
Total score: ${Math.round(totalScore)} / 200

Category scores:
${categoryLines}

Site health flags:
${healthLines}`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: userPrompt,
        tool: {
          name: "strategy_brief",
          description: "Return a short strategic synthesis of the visibility score",
          input_schema: {
            type: "object",
            properties: {
              headline: { type: "string", description: "A punchy one-line take, under 12 words." },
              narrative: { type: "string", description: "3-5 sentences connecting the dots across categories." },
            },
            required: ["headline", "narrative"],
          },
        },
      });
    } catch (e) {
      if (e instanceof ClaudeApiError) {
        return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw e;
    }

    await setCached(cached.key, "visibility-audit-narrative", cacheKey, result, ONE_DAY_MS);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("visibility-audit-narrative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
