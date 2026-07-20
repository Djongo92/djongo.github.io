import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { streamClaudeText } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { messages, chapterTitle, chapterContent, firmContext } = await req.json();

    const firmBlock = firmContext
      ? `\n\nThe reader's firm context:\n- Practice area: ${firmContext.practiceArea}\n- Firm size: ${firmContext.firmSize}\n- Primary goal: ${firmContext.primaryGoal}\n\nWhen relevant, tailor your answer to this firm.`
      : "";

    const systemPrompt = `You are an expert law firm marketing strategist with 20+ years of experience. You are answering questions specifically about Chapter "${chapterTitle}" of an exclusive marketing guidebook for managing partners and CMOs at law firms.

Here is the full chapter content you can reference:
---
${chapterContent}
---
${firmBlock}

Rules:
- Stay focused on this chapter's topic. If asked something far outside, gently steer back.
- Be direct, specific, and tactical. Avoid generic advice.
- Use markdown formatting (headers, bullets, bold) for readability.
- Speak peer-to-peer. The reader is a senior decision-maker.
- Keep answers concise (under 250 words) unless they ask for depth.`;

    return await streamClaudeText({ system: systemPrompt, messages }, corsHeaders);
  } catch (e) {
    console.error("chapter-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
