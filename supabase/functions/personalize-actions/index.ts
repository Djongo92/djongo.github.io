import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { actions, firmContext, chapterTitle } = await req.json();
    if (!firmContext) {
      return new Response(JSON.stringify({ error: "Firm context required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Rewrite these generic action items so they speak directly to a specific firm.

Firm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, primary goal: ${firmContext.primaryGoal}.

Chapter: ${chapterTitle}

Original actions:
${actions.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n")}

Rewrite each to be concrete and specific to this firm. Keep priority intent, add a 1-sentence "why this matters for you" rationale.`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: "You personalize generic guidance into firm-specific tactics. Be concrete.",
        user: userPrompt,
        tool: {
          name: "personalize",
          description: "Return firm-specific rewrites of the action items",
          input_schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    why: { type: "string" },
                  },
                  required: ["action", "why"],
                },
              },
            },
            required: ["items"],
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
    console.error("personalize-actions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
