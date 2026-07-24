import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { streamClaudeText } from "../_shared/anthropic.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { getRecentStyleExamples, buildStyleMemoryBlock } from "../_shared/styleMemory.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { currentBio, name, role, emphases, hookLine, firmContext, clientId: rawClientId, accessToken } = await req.json();
    if (!currentBio || currentBio.trim().length < 30) {
      return new Response(JSON.stringify({ error: "Paste at least a few sentences of the current bio." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      styleBlock = buildStyleMemoryBlock(await getRecentStyleExamples(serviceClient, clientId, "bio"));
    }
    const emphasisMap: Record<string, string> = {
      trial: "Trial credibility — courtroom wins, verdicts, juries handled, high-stakes outcomes.",
      deals: "Deal credibility — transactions closed, deal value, named counterparties, board-level work.",
      human: "Human-first — accessible, plain language, what it's like to actually work with them, why they got into law.",
      thought: "Thought leadership — published work, speaking, frameworks, shaping how the field thinks.",
      industry: "Industry depth — specific sector or client type they understand better than generalists.",
    };
    const emphasisBlock = (emphases && Array.isArray(emphases) && emphases.length)
      ? `Emphases (weight the rewrite toward these):\n${emphases.map((k: string) => `- ${emphasisMap[k] || k}`).join("\n")}`
      : "";

    const firmBlock = firmContext
      ? `\nFirm context: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You rewrite attorney bios so they read like a sharp profile, not a CV dump. Strict rules:
- Sound like a human wrote it. Short sentences. Active voice. Specific over generic.
- Lead with a hook line that signals what makes this person actually different.
- No "passionate", "trusted advisor", "committed", "results-driven", "broad range of clients", "across a variety of industries".
- Preserve every concrete fact (firm names, schools, bar admissions, awards, deal/case names). Don't invent any.
- If the source bio is vague, NAME that gap as "[Add specific: …]" placeholders rather than fabricating.
${firmBlock}
${styleBlock}

${emphasisBlock}

${hookLine ? `Suggested hook line / angle: ${hookLine}` : ""}

Output format (markdown):

## Short Version (≈50 words)

[The bio for a directory card or LinkedIn intro.]

## Long Version (≈180 words)

[The bio for their firm website page. Three short paragraphs.]

## What Changed

- [3-4 bullets explaining the moves you made, tying back to the emphases.]

## Suggested Next Move

[1-2 sentences: one concrete thing this attorney could do this quarter to make the bio even sharper — proof to collect, signal to add, etc.]`;

    const user = `Name: ${name || "(not provided)"}\nRole: ${role || "(not provided)"}\n\nCURRENT BIO:\n${currentBio}`;

    return await streamClaudeText({ system: systemPrompt, user }, corsHeaders);
  } catch (e) {
    console.error("workshop-bio-rewrite error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});