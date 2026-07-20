import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { copy, context, audience } = await req.json();
    if (!copy || typeof copy !== "string" || copy.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Paste at least 20 characters of copy." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a ruthless legal-marketing copy critic. Score the copy on six axes (0-10) and surface the most damaging issues with the exact offending phrases quoted verbatim.

Be honest. A 7 is a high score. 9+ is reserved for elite copy. Most legal copy scores 3-5. Cite specific phrases from the copy in every weak-spot finding.`;

    const ctxBlock = [context && `Context: ${context}`, audience && `Audience: ${audience}`].filter(Boolean).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${ctxBlock ? ctxBlock + "\n\n" : ""}COPY:\n\n${copy}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "autopsy",
            description: "Critique copy and return a structured autopsy.",
            parameters: {
              type: "object",
              properties: {
                overallScore: { type: "number", description: "Weighted overall score 0-100." },
                oneLineVerdict: { type: "string", description: "One brutally honest sentence." },
                axes: {
                  type: "array",
                  description: "Score on each axis 0-10.",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", enum: ["Clarity", "Specificity", "Jargon-free", "Hook Strength", "CTA", "Trust"] },
                      score: { type: "number" },
                      note: { type: "string", description: "Why this score. 1-2 sentences." },
                    },
                    required: ["name", "score", "note"],
                  },
                  minItems: 6, maxItems: 6,
                },
                weakSpots: {
                  type: "array",
                  description: "3-6 weakest phrases pulled directly from the copy with the fix.",
                  items: {
                    type: "object",
                    properties: {
                      quote: { type: "string", description: "Exact offending phrase from the copy." },
                      issue: { type: "string", description: "What's wrong with it." },
                      fix: { type: "string", description: "A drop-in rewrite." },
                    },
                    required: ["quote", "issue", "fix"],
                  },
                },
                strengths: { type: "array", items: { type: "string" }, description: "1-3 things this copy gets right." },
                topPriority: { type: "string", description: "The single most important fix to make first." },
              },
              required: ["overallScore", "oneLineVerdict", "axes", "weakSpots", "strengths", "topPriority"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "autopsy" } },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      console.error("AI error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No result");
    return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("workshop-autopsy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});