// Firm invite flow — a shareable-link invite rather than email (no SMTP
// configured in this project). action "create": the caller's own firm
// owner generates a token, valid 7 days. action "redeem": whoever holds
// the token and is signed in joins that firm as a member.
//
// Identity is always verified server-side from the caller's real
// Supabase Auth access token (never trusted from the request body) — this
// flow only makes sense for a real account, so unlike the audit endpoints
// there's no anonymous fallback.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { accessToken, action, token } = await req.json();

    if (!accessToken || typeof accessToken !== "string") {
      return new Response(JSON.stringify({ error: "accessToken is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action !== "create" && action !== "redeem") {
      return new Response(JSON.stringify({ error: "action must be 'create' or 'redeem'" }), {
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

    if (action === "create") {
      const { data: membership, error: membershipError } = await serviceClient
        .from("firm_members")
        .select("firm_id, role, firms(name)")
        .eq("user_id", userId)
        .eq("role", "owner")
        .maybeSingle();

      if (membershipError) {
        console.error("firm-invite membership lookup error:", membershipError);
        return new Response(JSON.stringify({ error: "Couldn't look up your firm" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!membership) {
        return new Response(JSON.stringify({ error: "Only a firm owner can invite teammates" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newToken = randomToken();
      const { error: insertError } = await serviceClient.from("firm_invites").insert({
        token: newToken,
        firm_id: membership.firm_id,
        created_by: userId,
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      });
      if (insertError) {
        console.error("firm-invite create error:", insertError);
        return new Response(JSON.stringify({ error: "Couldn't create the invite" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ token: newToken, expiresInDays: 7 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "redeem"
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "token is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invite, error: inviteError } = await serviceClient
      .from("firm_invites")
      .select("token, firm_id, expires_at, used_at, firms(name)")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("firm-invite redeem lookup error:", inviteError);
      return new Response(JSON.stringify({ error: "Couldn't look up that invite" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (invite.used_at) {
      return new Response(JSON.stringify({ error: "This invite has already been used" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "This invite has expired" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: memberInsertError } = await serviceClient
      .from("firm_members")
      .upsert({ firm_id: invite.firm_id, user_id: userId, role: "member" }, { onConflict: "firm_id,user_id" });
    if (memberInsertError) {
      console.error("firm-invite redeem insert error:", memberInsertError);
      return new Response(JSON.stringify({ error: "Couldn't join the firm" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await serviceClient.from("firm_invites").update({ used_by: userId, used_at: new Date().toISOString() }).eq("token", token);

    const firmName = (invite as unknown as { firms: { name: string } | null }).firms?.name ?? "the firm";
    return new Response(JSON.stringify({ firmId: invite.firm_id, firmName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("firm-invite error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
