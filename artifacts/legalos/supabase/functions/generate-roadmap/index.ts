import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
import { buildFirmContext } from "../_shared/firmContextProfile.ts";
import { firmContextLine, JURISDICTION_RULE } from "../_shared/firmContextLine.ts";
import { getRecentRunTitles, getLatestMaturityPlan, buildWorkDoneBlock } from "../_shared/crossToolContext.ts";
import { resolveClientIdGuarded, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { firmContext, readChapters, bookmarked, implementedActions, allActions, clientId: rawClientId, accessToken, activeFirmId } = await req.json();

    let firmContextBlock = "";
    let profileJurisdictions: string[] = [];
    let workDoneBlock = "";
    if (rawClientId && typeof rawClientId === "string") {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      const clientId = await resolveClientIdGuarded(serviceClient, rawClientId, identityToken, typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined);
      if (clientId) {
        firmContextBlock = await buildFirmContext(serviceClient, clientId).then((ctx) => { profileJurisdictions = ctx.jurisdictions; return ctx.block; });
        // Cross-tool awareness (task #121): what the Workshop already
        // produced in the last 30 days, plus any existing maturity plan —
        // the roadmap sequences around work already done.
        const [runs, plan] = await Promise.all([
          getRecentRunTitles(serviceClient, clientId, 30),
          getLatestMaturityPlan(serviceClient, clientId),
        ]);
        workDoneBlock = buildWorkDoneBlock(runs, plan);
      }
    }

    const firmBlock = firmContextLine(firmContext, profileJurisdictions) || "Firm context not provided.";

    const userPrompt = `Generate a personalized 30/60/90-day marketing roadmap.

${firmBlock}
${JURISDICTION_RULE}

Chapters they've read: ${readChapters.join(", ") || "none yet"}
Bookmarked: ${bookmarked.join(", ") || "none"}
Already implemented (${implementedActions.length}): ${implementedActions.slice(0, 10).join("; ") || "none"}

Available unimplemented actions across the guidebook:
${allActions.slice(0, 40).map((a: any) => `- [${a.priority}] (Ch ${a.chapterNumber}: ${a.chapterTitle}) ${a.text}`).join("\n")}

Build a focused, sequenced plan. Prioritize quick wins early, strategic items mid, long-term in the 90-day phase.`;

    let result: Record<string, unknown>;
    const systemPrompt = `You are a senior law firm marketing strategist building tactical roadmaps. Be specific, never generic.${firmContextBlock}
${workDoneBlock}`;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
        user: userPrompt,
        tool: {
          name: "build_roadmap",
          description: "Return a 30/60/90 day marketing roadmap",
          input_schema: {
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
