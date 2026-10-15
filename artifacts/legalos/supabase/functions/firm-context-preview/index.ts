// Deploy before going live: supabase functions deploy firm-context-preview
// --project-ref <ref> --no-verify-jwt --use-api (see ../README.md).
// Firm Context preview: returns the exact context block that gets injected
// into every workshop/narrative/planning system prompt for the caller's
// active firm, so admins can see (and then edit, via the firm profile
// fields) what the AI knows about their firm. Account-only: resolves
// identity strictly from the session token + activeFirmId pin — a
// consultant sees the block for whichever client workspace is active,
// never another firm's.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId } from "../_shared/verifiedClientId.ts";
import { buildFirmContextBlock } from "../_shared/firmContextProfile.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { accessToken, activeFirmId } = await req.json();
    if (!accessToken || typeof accessToken !== "string") {
      return new Response(JSON.stringify({ error: "accessToken is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveVerifiedClientId(
      serviceClient,
      accessToken,
      typeof activeFirmId === "string" ? activeFirmId : undefined,
    );
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Sign in to view the firm context." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextBlock = await buildFirmContextBlock(serviceClient, clientId);
    return new Response(JSON.stringify({ contextBlock, clientId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("firm-context-preview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
