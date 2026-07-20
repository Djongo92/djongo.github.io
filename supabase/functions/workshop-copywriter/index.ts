import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { streamClaudeText } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { brief, format, tone, firmContext } = await req.json();

    const firmBlock = firmContext
      ? `\nFirm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You are an elite legal marketing copywriter trained on the world's best-converting law firm copy.

Write copy in the requested format and tone. Strict rules:
- Never sound like a lawyer wrote it. Sound like a copywriter who happens to understand law.
- Specific over vague. Concrete over abstract. Active voice. Short sentences.
- No "we are committed", "passionate", "trusted advisor", "results-driven", or any other legal-marketing cliché.
- Match the format exactly. No preamble, no explanations, no "here's your copy:".${firmBlock}

Format: ${format}
Tone: ${tone}

Produce 3 distinctly different variations, labeled "## Variation 1 — [angle name]", "## Variation 2 — [angle name]", "## Variation 3 — [angle name]". Each labeled angle should be a 2-3 word summary of the strategic angle (e.g. "Direct & Confident", "Story-led", "Pain-point first").`;

    return await streamClaudeText({ system: systemPrompt, user: `Brief: ${brief}` }, corsHeaders);
  } catch (e) {
    console.error("workshop-copywriter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});