// §4 — workspace-admin-only member management: change a teammate's role,
// remove a teammate, or set/clear a time-bounded access expiry (for a
// consultant or executive given scoped, temporary access). Mirrors
// firm-invite's posture exactly: identity is always resolved server-side
// from the caller's real Supabase Auth access token, never trusted from
// the request body, and every write is gated on the caller actually being
// an owner/admin of the target member's firm.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const ASSIGNABLE_ROLES = new Set(["admin", "marketing", "partner", "consultant", "executive"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { accessToken, action, targetUserId, role, accessExpiresAt } = await req.json();

    if (!accessToken || typeof accessToken !== "string") {
      return new Response(JSON.stringify({ error: "accessToken is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(JSON.stringify({ error: "targetUserId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action !== "changeRole" && action !== "remove" && action !== "setExpiry") {
      return new Response(JSON.stringify({ error: "action must be 'changeRole', 'remove', or 'setExpiry'" }), {
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
    const callerId = userData.user.id;

    const { data: callerMembership } = await serviceClient
      .from("firm_members")
      .select("firm_id, role")
      .eq("user_id", callerId)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (!callerMembership) {
      return new Response(JSON.stringify({ error: "Only a workspace admin can manage the team" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: target } = await serviceClient
      .from("firm_members")
      .select("firm_id, role")
      .eq("firm_id", callerMembership.firm_id)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!target) {
      return new Response(JSON.stringify({ error: "That person isn't a member of your firm" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (target.role === "owner") {
      return new Response(JSON.stringify({ error: "The firm's original owner can't be modified or removed here" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (targetUserId === callerId) {
      return new Response(JSON.stringify({ error: "You can't change your own role or remove yourself here" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      const { error } = await serviceClient
        .from("firm_members")
        .delete()
        .eq("firm_id", callerMembership.firm_id)
        .eq("user_id", targetUserId);
      if (error) {
        console.error("firm-members-manage remove error:", error);
        return new Response(JSON.stringify({ error: "Couldn't remove that teammate" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "changeRole") {
      if (typeof role !== "string" || !ASSIGNABLE_ROLES.has(role)) {
        return new Response(JSON.stringify({ error: "role must be one of: " + [...ASSIGNABLE_ROLES].join(", ") }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await serviceClient
        .from("firm_members")
        .update({ role })
        .eq("firm_id", callerMembership.firm_id)
        .eq("user_id", targetUserId);
      if (error) {
        console.error("firm-members-manage changeRole error:", error);
        return new Response(JSON.stringify({ error: "Couldn't change that teammate's role" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, role }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // action === "setExpiry"
    if (accessExpiresAt !== null && typeof accessExpiresAt !== "string") {
      return new Response(JSON.stringify({ error: "accessExpiresAt must be an ISO date string or null" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error } = await serviceClient
      .from("firm_members")
      .update({ access_expires_at: accessExpiresAt })
      .eq("firm_id", callerMembership.firm_id)
      .eq("user_id", targetUserId);
    if (error) {
      console.error("firm-members-manage setExpiry error:", error);
      return new Response(JSON.stringify({ error: "Couldn't update that teammate's access expiry" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, accessExpiresAt }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("firm-members-manage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
