import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { streamClaudeText } from "../_shared/anthropic.ts";
import { buildFirmContext } from "../_shared/firmContextProfile.ts";
import { firmContextLine, JURISDICTION_RULE } from "../_shared/firmContextLine.ts";
import { resolveClientIdGuarded, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { scores, firmContext, clientId: rawClientId, accessToken, activeFirmId } = await req.json();

    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      const clientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      if (clientId) firmContextBlock = await buildFirmContext(serviceClient, clientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; });
    }

    // scores: { dimension: string, score: 1..5 }[]
    const scoreBlock = (scores || [])
      .map((s: { dimension: string; score: number }) => `- ${s.dimension}: ${s.score}/5`)
      .join("\n");

    const firmBlock = firmContextLine(firmContext, profileJurisdictions);

    const systemPrompt = `You are a senior law firm marketing strategist building a tailored 30-day action plan.

Firm self-assessment (1=non-existent, 5=best-in-class):
${scoreBlock}
${firmBlock}
${JURISDICTION_RULE}
${firmContextBlock}

Produce a precise, prescriptive 30-day plan in markdown:
1. Open with one paragraph diagnosing the firm's overall maturity profile (what's strong, what's weakest). If AUDIT HISTORY below shows multiple audits, acknowledge the trajectory (e.g. "visibility is up 9 points since July") — and if RECENT WORKSHOP ACTIVITY shows work already shipped, never prescribe redoing it; build on it.
2. Then a "Week 1 / Week 2 / Week 3 / Week 4" structure. Each week has 2-3 concrete actions tied to the weakest dimensions. Use bold for action names.
3. For each action, name the relevant guidebook chapter when natural (e.g., "see Chapter 6 on Brand"). Available chapters: Event Marketing, Website Fundamentals, Brand Identity, Content Marketing, Thought Leadership, SEO, Email Marketing, Social Media, PR & Media, Client Experience, Data & Analytics, Reputation Management, Internal Marketing Culture, Marketing Technology.
4. End with a single "North Star Metric" the firm should track for the next 90 days.

Be specific to the scores. Do not give generic advice. Under 500 words.`;

    return await streamClaudeText({ system: systemPrompt, user: "Generate my plan." }, corsHeaders);
  } catch (e) {
    console.error("firm-maturity-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});