import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { callClaudeTool, ClaudeApiError } from "../_shared/anthropic.ts";
import { buildFirmContext } from "../_shared/firmContextProfile.ts";
import { firmContextLine, JURISDICTION_RULE } from "../_shared/firmContextLine.ts";
import { resolveClientIdGuarded, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });



    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { actions, firmContext, chapterTitle, clientId: rawClientId, accessToken, activeFirmId } = await req.json();
    if (!firmContext) {
      return new Response(JSON.stringify({ error: "Firm context required" }), {
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

    const firmBlock = firmContextLine(firmContext, profileJurisdictions);

    const userPrompt = `Rewrite these generic action items so they speak directly to a specific firm.
${firmBlock}

Chapter: ${chapterTitle}

Original actions:
${actions.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n")}

Rewrite each to be concrete and specific to this firm. Keep priority intent, add a 1-sentence "why this matters for you" rationale.`;

    // firmBlock lives in the userPrompt next to the actions it shapes;
    // the system prompt carries the jurisdiction rule + firm memory only.
    const systemPrompt = `You personalize generic guidance into firm-specific tactics. Be concrete.
${JURISDICTION_RULE}${firmContextBlock}`;

    let result: Record<string, unknown>;
    try {
      result = await callClaudeTool({
        system: systemPrompt,
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
