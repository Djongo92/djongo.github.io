// Captures a Workshop "voice" tool's outcome — kept as-is, edited before
// keeping, or discarded — so the next generation for this firm+tool can
// draw on it (see _shared/styleMemory.ts). Scoped by clientId server-side,
// same pattern as user-state-set.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { recordStyleExample, type StyleToolId, type StyleVerdict } from "../_shared/styleMemory.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

const VALID_TOOLS: StyleToolId[] = ["bio", "headlines", "copywriter", "rewrite"];
const VALID_VERDICTS: StyleVerdict[] = ["approved", "edited", "rejected"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "workshop");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, toolId, inputSummary, finalText, verdict } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_TOOLS.includes(toolId)) {
      return new Response(JSON.stringify({ error: "Unsupported toolId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_VERDICTS.includes(verdict)) {
      return new Response(JSON.stringify({ error: "Unsupported verdict" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!finalText || typeof finalText !== "string" || finalText.trim().length === 0) {
      return new Response(JSON.stringify({ error: "finalText is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);
    const result = await recordStyleExample(
      serviceClient, clientId, toolId as StyleToolId,
      typeof inputSummary === "string" ? inputSummary : "",
      finalText, verdict as StyleVerdict,
    );

    if (!result.ok) {
      return new Response(JSON.stringify({ error: "Couldn't save feedback" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("workshop-style-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
