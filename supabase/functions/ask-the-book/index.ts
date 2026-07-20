import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

/**
 * Ask the Whole Book — answers user questions across all 14 chapters.
 * Returns a synthesized answer plus structured chapter citations.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { question, chapters: chapterPayload, firmContext } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(chapterPayload) || chapterPayload.length === 0) {
      return new Response(JSON.stringify({ error: "chapters payload is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firmBlock = firmContext
      ? `\nReader firm: ${firmContext.practiceArea}, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}. Personalize your answer.`
      : "";

    // Build a corpus block. Each chapter is bounded so the model can cite by id/number.
    const corpus = (chapterPayload as Array<{ id: string; number: number; title: string; text: string }>)
      .map((c) => `\n=== CHAPTER ${c.number} | id:${c.id} | "${c.title}" ===\n${c.text.slice(0, 3500)}`)
      .join("\n");

    const systemPrompt = `You are the omniscient strategist for "The Legal Web Playbook". You have the full text of all chapters in your context and you answer questions by synthesizing across chapters.${firmBlock}

Rules:
- Answer with concrete, opinionated guidance. Never hedge.
- Always cite the chapters you drew from (use the id, number, and title).
- If 2+ chapters apply, synthesize them — don't list them serially.
- If the answer isn't in the book, say so plainly.
- Be specific. Quote ideas from the chapters where it sharpens the answer.`;

    const userPrompt = `Question: ${question}\n\nThe book:${corpus}`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: userPrompt,
        tool: {
          name: "answer_with_citations",
          description: "Answer the question with structured citations to chapters used.",
          input_schema: {
            type: "object",
            properties: {
              answer: {
                type: "string",
                description: "The synthesized answer in markdown. 2-5 short paragraphs. Strategic, opinionated.",
              },
              keyTakeaways: {
                type: "array",
                description: "3-5 sharp takeaways the reader should act on.",
                items: { type: "string" },
                minItems: 3,
                maxItems: 5,
              },
              citations: {
                type: "array",
                description: "The chapters that informed the answer. Only include chapters you actually used.",
                items: {
                  type: "object",
                  properties: {
                    chapterId: { type: "string" },
                    chapterNumber: { type: "number" },
                    title: { type: "string" },
                    relevance: { type: "string", description: "1 sentence on why this chapter is relevant." },
                  },
                  required: ["chapterId", "chapterNumber", "title", "relevance"],
                },
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "How well does the book answer this? Low = the question is outside the book's scope.",
              },
            },
            required: ["answer", "keyTakeaways", "citations", "confidence"],
          },
        },
      });
    } catch (e) {
      if (e instanceof ClaudeApiError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ask-the-book error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
