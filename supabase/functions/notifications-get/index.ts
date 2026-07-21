// Real notification history for a signed-in account — see
// 20260722060000_notifications.sql for why this replaces the old
// derived-on-every-render Bell list. Anonymous/demo callers have no
// accessToken, so resolveClientId just echoes the client-asserted id back;
// that's fine since notifications are only ever written for real accounts
// (see visibility-audit-rerun-due) — an anonymous id will just always come
// back empty.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const LIMIT = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    const { data, error } = await serviceClient
      .from("notifications")
      .select("id, type, title, body, created_at, read_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    if (error) {
      console.error("notifications-get error:", error);
      return new Response(JSON.stringify({ error: "Couldn't load notifications" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifications = data ?? [];
    const unreadCount = notifications.filter((n) => !n.read_at).length;

    return new Response(JSON.stringify({ notifications, unreadCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notifications-get error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
