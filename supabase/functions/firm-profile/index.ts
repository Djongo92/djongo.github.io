// §5 — Firm profile: get/save. Identity and firm membership are always
// resolved server-side from the caller's real Supabase Auth access token,
// same posture as firm-invite/firm-members-manage. "get" works for any
// member (read-only executives included); "save" additionally checks the
// caller's role against canEditFirmProfile (src/lib/roles.ts) — a read-
// only executive or a partner contributor can see the profile but not
// change it.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

// Mirrors src/lib/roles.ts's canEditFirmProfile column exactly — kept as a
// small literal set here rather than importing the frontend module, since
// this function has no build step that would let it share a TS file with
// the Vite app without duplicating the import graph.
const CAN_EDIT_ROLES = new Set(["owner", "admin", "marketing", "consultant", "member"]);

const EDITABLE_FIELDS = [
  "jurisdictions", "offices", "practice_areas", "tone_of_voice", "preferred_terminology",
  "competitor_set", "website", "linkedin_url", "directory_profiles", "lawyer_roster",
  "brand_rules", "client_restrictions", "approved_content",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { accessToken, action } = body;

    if (!accessToken || typeof accessToken !== "string") {
      return new Response(JSON.stringify({ error: "accessToken is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action !== "get" && action !== "save") {
      return new Response(JSON.stringify({ error: "action must be 'get' or 'save'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userError } = await serviceClient.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Couldn't verify your session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { data: membership } = await serviceClient
      .from("firm_members")
      .select("firm_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "You're not a member of a firm yet" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      const { data, error } = await serviceClient
        .from("firm_profiles")
        .select("*")
        .eq("firm_id", membership.firm_id)
        .maybeSingle();
      if (error) {
        console.error("firm-profile get error:", error);
        return new Response(JSON.stringify({ error: "Couldn't load the firm profile" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ profile: data ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "save"
    if (!CAN_EDIT_ROLES.has(membership.role)) {
      return new Response(JSON.stringify({ error: "Your role doesn't have permission to edit the firm profile" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) patch[field] = body[field];
    }

    const { data, error } = await serviceClient
      .from("firm_profiles")
      .upsert({ firm_id: membership.firm_id, ...patch, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: "firm_id" })
      .select("*")
      .single();

    if (error) {
      console.error("firm-profile save error:", error);
      return new Response(JSON.stringify({ error: "Couldn't save the firm profile" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ profile: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("firm-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
