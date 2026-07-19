import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "answer_with_citations",
            description: "Answer the question with structured citations to chapters used.",
            parameters: {
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
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "answer_with_citations" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      console.error("AI error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No answer returned");
    return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ask-the-book error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});