// Marks notifications read for the caller's resolved identity. Pass `ids`
// to mark specific ones (e.g. dismiss a single item) or omit it to mark
// every currently-unread notification read (the sidebar Bell's "Mark all
// read" action).
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, ids } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ids !== undefined && !Array.isArray(ids)) {
      return new Response(JSON.stringify({ error: "ids must be an array when provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    let query = serviceClient
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("client_id", clientId)
      .is("read_at", null);

    if (Array.isArray(ids) && ids.length > 0) {
      query = query.in("id", ids);
    }

    const { error } = await query;
    if (error) {
      console.error("notifications-mark-read error:", error);
      return new Response(JSON.stringify({ error: "Couldn't update notifications" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notifications-mark-read error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
