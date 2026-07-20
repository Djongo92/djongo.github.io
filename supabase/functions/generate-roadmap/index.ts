import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { firmContext, readChapters, bookmarked, implementedActions, allActions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const firmBlock = firmContext
      ? `Firm: ${firmContext.practiceArea}, ${firmContext.firmSize}, goal: ${firmContext.primaryGoal}.`
      : "Firm context not provided.";

    const userPrompt = `Generate a personalized 30/60/90-day marketing roadmap.

${firmBlock}

Chapters they've read: ${readChapters.join(", ") || "none yet"}
Bookmarked: ${bookmarked.join(", ") || "none"}
Already implemented (${implementedActions.length}): ${implementedActions.slice(0, 10).join("; ") || "none"}

Available unimplemented actions across the guidebook:
${allActions.slice(0, 40).map((a: any) => `- [${a.priority}] (Ch ${a.chapterNumber}: ${a.chapterTitle}) ${a.text}`).join("\n")}

Build a focused, sequenced plan. Prioritize quick wins early, strategic items mid, long-term in the 90-day phase.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a senior law firm marketing strategist building tactical roadmaps. Be specific, never generic." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "build_roadmap",
            description: "Return a 30/60/90 day marketing roadmap",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-sentence opening framing the plan" },
                phases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string", enum: ["First 30 days", "Days 31-60", "Days 61-90"] },
                      focus: { type: "string", description: "1-line theme for this phase" },
                      actions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            why: { type: "string" },
                            chapterRef: { type: "string", description: "e.g. 'Chapter 6'" },
                          },
                          required: ["title", "why", "chapterRef"],
                        },
                      },
                    },
                    required: ["label", "focus", "actions"],
                  },
                  minItems: 3,
                  maxItems: 3,
                },
              },
              required: ["summary", "phases"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "build_roadmap" } },
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
    if (!args) throw new Error("No roadmap result");
    const result = JSON.parse(args);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-roadmap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
