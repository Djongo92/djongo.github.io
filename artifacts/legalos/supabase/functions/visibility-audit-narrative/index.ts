// Turns the five category scores + site health into a short, direct
// written synthesis — the "AI Strategy Brief" on the Command Center
// dashboard. This is deliberately an AI opinion layered on top of the
// verified score, not a replacement for it — same posture as
// GlobalAdvisor's "Strategy Advisor" elsewhere in this app (Sparkles icon,
// primary/gold branding, clearly distinct from the emerald "Verified"
// score itself).
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { JURISDICTION_RULE, resolveEffectiveMarket } from "../_shared/firmContextLine.ts";
import { getCached, setCached } from "../_shared/cache.ts";
import { buildNarrativeCacheKey } from "../_shared/narrativeCacheKey.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
import { buildFirmContext } from "../_shared/firmContextProfile.ts";
import { resolveClientIdGuarded, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { domain, market, peerGroup, totalScore, categories, siteHealthIssues, clientId: rawClientId, accessToken, activeFirmId } = await req.json();
    if (!domain || !categories) {
      return new Response(JSON.stringify({ error: "domain and categories are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    let resolvedClientId: string | null = null;
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      resolvedClientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      if (resolvedClientId) firmContextBlock = await buildFirmContext(serviceClient, resolvedClientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; });
    }

    // Task #147: the request-body market is what THIS audit was scored in —
    // historical metadata. The firm profile's jurisdictions are authoritative;
    // when they exist the prompt must not present the audit market as current.
    const marketResolution = resolveEffectiveMarket(typeof market === "string" ? market : undefined, profileJurisdictions);
    const marketLine = marketResolution.source === "profile"
      ? `Market: ${marketResolution.market} (authoritative, from firm profile) · this audit was scored in market: ${market} · Peer group: ${peerGroup}`
      : `Market: ${market} · Peer group: ${peerGroup}`;

    // getCached/setCached are shaped around real URLs; this isn't one, but
    // shaping the key as a URL-like string keeps it flowing through their
    // normalization cleanly instead of hitting their catch-all fallback path.
    // The brief is user-facing copy: every number the model sees must be on
    // the public 500-point scale (totals) or a percentage of category
    // potential — raw 200-scale internals would contradict the dashboard.
    const catEntries = Object.entries(categories) as [string, { score: number; max: number; provenance: string }][];
    const measuredMax = catEntries.reduce((sum, [, c]) => sum + (c.provenance === "missing" ? 0 : c.max), 0) || 200;
    const isPartial = measuredMax < 200;
    const scaledTotal = Math.round((totalScore / measuredMax) * 500);
    const categoryLines = catEntries
      .map(([key, cat]) => cat.provenance === "missing"
        ? `- ${key}: not measured`
        : `- ${key}: ${Math.round((cat.score / cat.max) * 100)}% of category potential (${cat.provenance})`)
      .join("\n");
    const cacheKey = buildNarrativeCacheKey({
      domain,
      market: marketResolution.market ?? market,
      peerGroup,
      scaledTotal,
      measuredMax,
      clientId: resolvedClientId ?? "anon",
      categories: categories as Record<string, { score: number; max: number; provenance: string }>,
      siteHealthIssues: (siteHealthIssues as string[]) ?? [],
    });
    const cached = await getCached("visibility-audit-narrative", cacheKey);
    if (cached.hit) {
      return new Response(JSON.stringify(cached.hit), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const healthLines = (siteHealthIssues as string[] || []).map((i) => `- ${i}`).join("\n") || "(none flagged)";

    // Cross-tool awareness (task #121): the firm context block carries the
    // last 4 audits — when a trend exists the narrative must NAME it rather
    // than restate the current score in isolation.
    const systemPrompt = `You are a sharp, direct marketing strategist reviewing a law firm's externally-verified digital visibility score (peer-group-normalized, five categories, public 500-point scale — all scores and point deltas you mention must use that scale). Write a short synthesis connecting the dots across categories — not a restatement of the numbers. Call out the single most consequential pattern (e.g. a category that's actively undermining another, or a strength that isn't being leveraged). When AUDIT HISTORY below shows more than one audit, name the trajectory explicitly (e.g. "up 9 points since July") — never state the current score without its trend when a trend exists. No legal-marketing cliches ("trusted advisor", "results-driven"). Confident, specific, a little blunt — like a strategist giving a real read, not a report generator.${firmContextBlock}
${JURISDICTION_RULE}`;

    const userPrompt = `Domain: ${domain}
${marketLine}
Total score: ${scaledTotal} / 500${isPartial ? " (partial — some categories not yet measured)" : ""}

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
