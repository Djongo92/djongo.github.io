import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
import { buildFirmContext } from "../_shared/firmContextProfile.ts";
import { firmContextLine, JURISDICTION_RULE } from "../_shared/firmContextLine.ts";
import { resolveClientIdGuarded, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;try {
    const { copy, context, audience, firmContext, clientId: rawClientId, accessToken, activeFirmId } = await req.json();
    if (!copy || typeof copy !== "string" || copy.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Paste at least 20 characters of copy." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      const clientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      if (clientId) firmContextBlock = await buildFirmContext(serviceClient, clientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; });
    }

    const systemPrompt = `You are a ruthless legal-marketing copy critic. Score the copy on six axes (0-10) and surface the most damaging issues with the exact offending phrases quoted verbatim.

Be honest. A 7 is a high score. 9+ is reserved for elite copy. Most legal copy scores 3-5. Cite specific phrases from the copy in every weak-spot finding.${firmContextLine(firmContext, profileJurisdictions)}${firmContextBlock}
${JURISDICTION_RULE}`;

    const ctxBlock = [context && `Context: ${context}`, audience && `Audience: ${audience}`].filter(Boolean).join("\n");

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: `${ctxBlock ? ctxBlock + "\n\n" : ""}COPY:\n\n${copy}`,
        tool: {
          name: "autopsy",
          description: "Critique copy and return a structured autopsy.",
          input_schema: {
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
    console.error("workshop-autopsy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
