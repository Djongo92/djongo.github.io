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
    const { messages, guidebookSummary, userProgress, firmContext, clientId: rawClientId, accessToken, activeFirmId } = await req.json();

    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      const clientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      if (clientId) firmContextBlock = await buildFirmContext(serviceClient, clientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; });
    }

    const firmBlock = firmContextLine(firmContext, profileJurisdictions);

    const progressBlock = userProgress
      ? `\n\nReader's progress so far:\n- Chapters read: ${userProgress.read.join(", ") || "none yet"}\n- Bookmarked: ${userProgress.bookmarked.join(", ") || "none"}\n- Implemented actions: ${userProgress.implementedCount} of ${userProgress.totalActions}`
      : "";

    const systemPrompt = `You are the reader's personal law firm marketing strategist — an extension of the guidebook's author. You have the full guidebook in mind and you know the reader's progress.

Guidebook overview:
${guidebookSummary}
${firmBlock}
${JURISDICTION_RULE}
${progressBlock}

Rules:
- Speak as a trusted senior advisor. Confident, warm, never patronizing.
- Reference specific chapters when relevant (e.g., "Chapter 6 covers this in depth").
- Be tactical. Give next-step thinking, not theory.
- Use markdown. Keep replies under 250 words unless depth is requested.
${firmContextBlock}`;

    return await streamClaudeText({ system: systemPrompt, messages }, corsHeaders);
  } catch (e) {
    console.error("global-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
