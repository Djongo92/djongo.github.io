import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { streamClaudeText } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { messages, guidebookSummary, userProgress, firmContext } = await req.json();

    const firmBlock = firmContext
      ? `\n\nReader's firm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.`
      : "";

    const progressBlock = userProgress
      ? `\n\nReader's progress so far:\n- Chapters read: ${userProgress.read.join(", ") || "none yet"}\n- Bookmarked: ${userProgress.bookmarked.join(", ") || "none"}\n- Implemented actions: ${userProgress.implementedCount} of ${userProgress.totalActions}`
      : "";

    const systemPrompt = `You are the reader's personal law firm marketing strategist — an extension of the guidebook's author. You have the full guidebook in mind and you know the reader's progress.

Guidebook overview:
${guidebookSummary}
${firmBlock}
${progressBlock}

Rules:
- Speak as a trusted senior advisor. Confident, warm, never patronizing.
- Reference specific chapters when relevant (e.g., "Chapter 6 covers this in depth").
- Be tactical. Give next-step thinking, not theory.
- Use markdown. Keep replies under 250 words unless depth is requested.`;

    return await streamClaudeText({ system: systemPrompt, messages }, corsHeaders);
  } catch (e) {
    console.error("global-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
