import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { getStyleExamples, buildStyleMemoryBlock } from "../_shared/styleMemory.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { mode, brief, audience, mustInclude, avoid, contenders, firmContext, clientId: rawClientId, accessToken } = await req.json();

    if (mode === "judge") {
      if (!Array.isArray(contenders) || contenders.length < 2) {
        return new Response(JSON.stringify({ error: "Need at least 2 contenders to judge." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const systemPrompt = `You are an A/B test judge for legal marketing headlines. Predict which would convert better given the audience and context. Be specific about WHY.`;
      const user = `Audience: ${audience || "potential clients"}\nContext: ${brief}\n\nA) ${contenders[0]}\nB) ${contenders[1]}`;

      let judged: Record<string, unknown>;
      try {
        judged = await callClaudeTool({
          system: systemPrompt,
          user,
          tool: {
            name: "judge",
            description: "Return the winning headline with reasoning and confidence.",
            input_schema: {
              type: "object",
              properties: {
                winner: { type: "string", enum: ["A", "B"] },
                reason: { type: "string", description: "1-2 sentences explaining why." },
                confidence: { type: "number", description: "0-100" },
              },
              required: ["winner", "reason", "confidence"],
            },
          },
        });
      } catch (e) {
        if (e instanceof ClaudeApiError) {
          return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw e;
      }
      return new Response(JSON.stringify(judged), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // mode === "generate" (default)
    if (!brief || brief.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Tell us what the headline is for (10+ chars)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let styleBlock = "";
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);
      styleBlock = buildStyleMemoryBlock(await getStyleExamples(serviceClient, clientId, "headlines", brief));
    }

    const firmBlock = firmContext
      ? `\nFirm: ${firmContext.practiceArea} practice, ${firmContext.firmSize}, goal: ${firmContext.primaryGoal}.`
      : "";

    const systemPrompt = `You are an elite legal marketing headline writer. Generate 20 distinctly different headlines, each from a different strategic angle. No legal cliches ("trusted", "passionate", "results-driven", "committed"). Specific over vague. Active voice.${firmBlock}
${styleBlock}
Audience: ${audience || "prospective clients researching their legal options"}
${mustInclude ? `Must include: ${mustInclude}` : ""}
${avoid ? `Must avoid: ${avoid}` : ""}

Score each headline 1-10 on predicted conversion strength for this audience. Be honest — only 2-3 should score 8+.`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: `Brief: ${brief}`,
        tool: {
          name: "headlines",
          description: "Return 20 distinct headline options with scores.",
          input_schema: {
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
          },
        },
      });
    } catch (e) {
      if (e instanceof ClaudeApiError) {
        return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw e;
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("workshop-headlines error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
