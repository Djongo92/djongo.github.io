// Flips is_public = true, published_at = now() on a client's own audit row.
// Mirrors create-share's posture: service_role write, client never sets
// is_public directly, ownership checked server-side by clientId rather than
// trusted from the request.
//
// Publishing requires verified_at to be set (see
// visibility-audit-verify-domain) — without this, anyone could publish a
// score against a domain they don't control. Unpublishing has no such
// requirement.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, auditId, isPublic } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!auditId || typeof auditId !== "string") {
      return new Response(JSON.stringify({ error: "auditId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const publish = isPublic !== false; // default true — this is the "publish" endpoint; unpublish passes isPublic: false

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // A real access token — never a client-asserted clientId — decides
    // identity when one is present (see _shared/verifiedClientId.ts).
    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    if (publish) {
      const { data: existing, error: existingError } = await serviceClient
        .from("market_visibility_audits")
        .select("verified_at")
        .eq("id", auditId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (existingError) {
        console.error("visibility-audit-publish verify-check error:", existingError);
        return new Response(JSON.stringify({ error: "Couldn't check verification status" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!existing) {
        return new Response(JSON.stringify({ error: "Audit not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!existing.verified_at) {
        return new Response(JSON.stringify({ error: "Verify domain ownership before publishing", code: "unverified" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data, error } = await serviceClient
      .from("market_visibility_audits")
      .update({ is_public: publish, published_at: publish ? new Date().toISOString() : null })
      .eq("id", auditId)
      .eq("client_id", clientId) // ownership check — never trust a bare id from the client
      .select("id, is_public, published_at")
      .maybeSingle();

    if (error) {
      console.error("visibility-audit-publish update error:", error);
      return new Response(JSON.stringify({ error: "Couldn't update the audit" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data) {
      return new Response(JSON.stringify({ error: "Audit not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-publish error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
