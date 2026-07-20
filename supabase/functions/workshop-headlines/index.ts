import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { mode, brief, audience, mustInclude, avoid, contenders, firmContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (mode === "judge") {
      if (!Array.isArray(contenders) || contenders.length < 2) {
        return new Response(JSON.stringify({ error: "Need at least 2 contenders to judge." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const systemPrompt = `You are an A/B test judge for legal marketing headlines. Predict which would convert better given the audience and context. Be specific about WHY.`;
      const user = `Audience: ${audience || "potential clients"}\nContext: ${brief}\n\nA) ${contenders[0]}\nB) ${contenders[1]}`;
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: user }],
          tools: [{
            type: "function",
            function: {
              name: "judge",
              parameters: {
                type: "object",
                properties: {
                  winner: { type: "string", enum: ["A", "B"] },
                  reason: { type: "string", description: "1-2 sentences explaining why." },
                  confidence: { type: "number", description: "0-100" },
                },
                required: ["winner", "reason", "confidence"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "judge" } },
        }),
      });
      if (!resp.ok) throw new Error("AI error");
      const j = await resp.json();
      const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // mode === "generate" (default)
    if (!brief || brief.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Tell us what the headline is for (10+ chars)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firmBlock = firmContext
      ? `\nFirm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You are an elite legal marketing headline writer. Generate 20 distinctly different headlines, each from a different strategic angle. No legal cliches ("trusted", "passionate", "results-driven", "committed"). Specific over vague. Active voice.${firmBlock}

Audience: ${audience || "prospective clients researching their legal options"}
${mustInclude ? `Must include: ${mustInclude}` : ""}
${avoid ? `Must avoid: ${avoid}` : ""}

Score each headline 1-10 on predicted conversion strength for this audience. Be honest — only 2-3 should score 8+.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Brief: ${brief}` }],
        tools: [{
          type: "function",
          function: {
            name: "headlines",
            parameters: {
              type: "object",
              properties: {
                headlines: {
                  type: "array",
                  minItems: 20, maxItems: 20,
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      angle: { type: "string", description: "2-4 word angle label (e.g. 'Pain-point', 'Direct ask', 'Story', 'Stat-led')." },
                      score: { type: "number", description: "1-10 predicted strength" },
                      why: { type: "string", description: "One sentence on why this angle works for this audience." },
                    },
                    required: ["text", "angle", "score", "why"],
                  },
                },
              },
              required: ["headlines"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "headlines" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      console.error("AI error:", resp.status, await resp.text());
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("workshop-headlines error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});