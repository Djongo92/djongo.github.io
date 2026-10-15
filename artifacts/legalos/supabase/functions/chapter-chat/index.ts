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
    const { messages, chapterTitle, chapterContent, firmContext, clientId: rawClientId, accessToken, activeFirmId } = await req.json();

    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      const clientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      if (clientId) firmContextBlock = await buildFirmContext(serviceClient, clientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; });
    }

    const firmBlock = firmContextLine(firmContext, profileJurisdictions);

    const systemPrompt = `You are an expert law firm marketing strategist with 20+ years of experience. You are answering questions specifically about Chapter "${chapterTitle}" of an exclusive marketing guidebook for managing partners and CMOs at law firms.

Here is the full chapter content you can reference:
---
${chapterContent}
---
${firmBlock}
${JURISDICTION_RULE}

Rules:
- Stay focused on this chapter's topic. If asked something far outside, gently steer back.
- Be direct, specific, and tactical. Avoid generic advice.
- Use markdown formatting (headers, bullets, bold) for readability.
- Speak peer-to-peer. The reader is a senior decision-maker.
- Keep answers concise (under 250 words) unless they ask for depth.${firmContextBlock}`;

    return await streamClaudeText({ system: systemPrompt, messages }, corsHeaders);
  } catch (e) {
    console.error("chapter-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
