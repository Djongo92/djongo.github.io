import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { streamClaudeText } from "../_shared/anthropic.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { getStyleExamples, buildStyleMemoryBlock } from "../_shared/styleMemory.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { original, chapterTitle, chapterFramework, goal, firmContext, clientId: rawClientId, accessToken, voiceTag } = await req.json();

    if (!original || typeof original !== "string" || original.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Paste at least a sentence or two of current copy." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let styleBlock = "";
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);
      styleBlock = buildStyleMemoryBlock(await getStyleExamples(serviceClient, clientId, "rewrite", original, 3, typeof voiceTag === "string" ? voiceTag : null));
    }

    const firmBlock = firmContext
      ? `\nFirm context: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You are an elite legal marketing copywriter. Rewrite the user's current copy applying the framework from "${chapterTitle}".

Framework principles to apply:
${chapterFramework}

Strict output rules:
- Never sound like a lawyer wrote it. Sound like a copywriter who happens to understand law.
- Specific over vague. Concrete over abstract. Active voice. Short sentences.
- No "we are committed", "passionate", "trusted advisor", "results-driven", or any other legal-marketing cliché.
- Preserve facts. Don't invent credentials, awards, or numbers.${firmBlock}
${styleBlock}

Goal for the rewrite: ${goal || "Make it more compelling and conversion-focused while staying on-brand."}

Respond in this exact markdown structure:

## Rewritten Copy

[the rewritten version, ready to ship]

## What Changed

- [3-5 short bullets explaining the most important moves you made and why, tying back to the framework]

## One Step Further

[1-2 sentences suggesting an optional bolder version or a follow-on test the firm could run.]`;

    return await streamClaudeText({ system: systemPrompt, user: `Current copy:\n\n${original}` }, corsHeaders);
  } catch (e) {
    console.error("workshop-rewrite error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});