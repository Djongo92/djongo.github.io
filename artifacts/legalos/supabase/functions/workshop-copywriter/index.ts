import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { streamClaudeText } from "../_shared/anthropic.ts";
import { resolveClientIdGuarded, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { getStyleExamples, buildStyleMemoryBlock } from "../_shared/styleMemory.ts";
import { buildFirmContext } from "../_shared/firmContextProfile.ts";
import { firmContextLine, JURISDICTION_RULE } from "../_shared/firmContextLine.ts";
import { getApprovedVoiceDirections, buildApprovedVoiceBlock } from "../_shared/crossToolContext.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { brief, format, tone, firmContext, clientId: rawClientId, accessToken, activeFirmId, voiceTag } = await req.json();

    let styleBlock = "";
    let voiceBlock = "";
    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      // Guarded identity: anonymous demo + legacy workshop-token callers
      // have no session, so unclaimed browser ids still pass — but an id a
      // real account owns requires a verified token, or this read of style
      // memory is a one-request IDOR. The header fallback covers callers
      // whose session travels in headers (mobile), not the body.
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      const clientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      firmContextBlock = clientId ? await buildFirmContext(serviceClient, clientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; }) : "";
      if (!clientId) {
        return new Response(JSON.stringify({ error: "Sign in to use this feature." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      styleBlock = buildStyleMemoryBlock(await getStyleExamples(serviceClient, clientId, "copywriter", brief, 3, typeof voiceTag === "string" ? voiceTag : null));
      // Cross-tool awareness (task #121): the bio and headline directions
      // this firm already approved — the copywriter should match that voice
      // without being told again.
      voiceBlock = buildApprovedVoiceBlock(await getApprovedVoiceDirections(serviceClient, clientId));
    }

    const firmBlock = firmContextLine(firmContext, profileJurisdictions);

    const systemPrompt = `You are an elite legal marketing copywriter trained on the world's best-converting law firm copy.

Write copy in the requested format and tone. Strict rules:
- Never sound like a lawyer wrote it. Sound like a copywriter who happens to understand law.
- Specific over vague. Concrete over abstract. Active voice. Short sentences.
- No "we are committed", "passionate", "trusted advisor", "results-driven", or any other legal-marketing cliché.
- Match the format exactly. No preamble, no explanations, no "here's your copy:".${firmBlock}
${JURISDICTION_RULE}
${styleBlock}
${voiceBlock}
${firmContextBlock}

Format: ${format}
Tone: ${tone}

Produce 3 distinctly different variations, labeled "## Variation 1 — [angle name]", "## Variation 2 — [angle name]", "## Variation 3 — [angle name]". Each labeled angle should be a 2-3 word summary of the strategic angle (e.g. "Direct & Confident", "Story-led", "Pain-point first").`;

    return await streamClaudeText({ system: systemPrompt, user: `Brief: ${brief}` }, corsHeaders);
  } catch (e) {
    console.error("workshop-copywriter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});