import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { chapterTitle, chapterContent } = await req.json();

    const userPrompt = `Create a 5-question self-assessment quiz for the chapter "${chapterTitle}".

Chapter content:
${chapterContent}

Make questions that test real understanding and application — not trivia. Each question should have 4 options with exactly one correct answer. Include short feedback explaining the right answer.`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: "You design thoughtful self-assessments for senior professionals.",
        user: userPrompt,
        tool: {
          name: "build_quiz",
          description: "Return a 5-question quiz with options, correct answers, and explanations.",
          input_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                    correctIndex: { type: "number", minimum: 0, maximum: 3 },
                    explanation: { type: "string" },
                  },
                  required: ["question", "options", "correctIndex", "explanation"],
                },
              },
            },
            required: ["questions"],
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
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
