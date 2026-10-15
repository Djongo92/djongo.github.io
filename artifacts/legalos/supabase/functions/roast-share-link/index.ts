// Task #136 — shareable read-only links for Roast My Deck results. A firm
// mints an expiring link whose id is the bearer token; a partner with no
// account opens /roast-share/<id> and this function serves the stored roast
// JSON through the service role (roast_share_links has no anon grant — see
// the migration comment). Read-only by design: no comment/approve actions
// (that's battle_plan_partner_links' job).
//
// Deploy: npx -y supabase@latest functions deploy roast-share-link \
//   --project-ref <ref> --no-verify-jwt --use-api   (see functions/README.md)
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { resolveLinkManagerRole } from "../_shared/firmRoleGate.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
// A visual roast carries per-slide design notes; 250k chars is far above any
// real result and keeps the row comfortably under PostgREST payload limits.
const MAX_PAYLOAD_CHARS = 250_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, accessToken, activeFirmId } = body;

    // Authorization splits by action (same posture as workflow-partner-link):
    // "create"/"list"/"revoke" act on a firm's links, so they must prove a
    // real session; "view" is public by design — the link id is the bearer
    // token.
    if (action === "create" || action === "list" || action === "revoke") {
      const unauthorized = await requireAccess(req, corsHeaders, "any");
      if (unauthorized) return unauthorized;
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Shared gate for the owner-side actions (task #151 — create/list/revoke).
    // Strict identity: never fall back to a caller-asserted clientId, or
    // anyone could forge link actions billed to any firm whose id they know.
    // Fail closed on role: the gate is scoped to BOTH the user and the
    // resolved firm — a user-only lookup silently authorizes multi-firm
    // users (code review on task #136).
    const resolveManager = async (): Promise<{ clientId: string; userId: string } | Response> => {
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      const clientId = await resolveVerifiedClientId(serviceClient, identityToken, typeof activeFirmId === "string" ? activeFirmId : undefined);
      if (!clientId) {
        return new Response(JSON.stringify({ error: "Sign in to manage share links." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData } = await serviceClient.auth.getUser(identityToken);
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: "Sign in to manage share links." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const gate = await resolveLinkManagerRole(serviceClient, userData.user.id, clientId);
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: gate.error }), {
          status: gate.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return { clientId, userId: userData.user.id };
    };

    if (action === "create") {
      const { payload, fileName, recipientLabel, expiresInDays } = body;
      const manager = await resolveManager();
      if (manager instanceof Response) return manager;
      const { clientId, userId: createdBy } = manager;

      // The roast JSON is stored verbatim (run-history already persists it
      // client-side) — validate shape minimally and cap the size.
      if (!payload || typeof payload !== "object" || Array.isArray(payload) || typeof (payload as Record<string, unknown>).verdict !== "string") {
        return new Response(JSON.stringify({ error: "payload must be a roast result object" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) {
        return new Response(JSON.stringify({ error: "That roast is too large to share" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const days = Number.isFinite(Number(expiresInDays)) && Number(expiresInDays) > 0 ? Math.min(Number(expiresInDays), 30) : 7;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await serviceClient
        .from("roast_share_links")
        .insert({
          client_id: clientId,
          payload,
          file_name: typeof fileName === "string" && fileName.trim() ? fileName.trim().slice(0, 200) : null,
          recipient_label: typeof recipientLabel === "string" && recipientLabel.trim() ? recipientLabel.trim().slice(0, 120) : null,
          created_by: createdBy,
          expires_at: expiresAt,
        })
        .select("id, expires_at")
        .single();

      if (error || !data) {
        console.error("roast-share-link create error:", error);
        return new Response(JSON.stringify({ error: "Couldn't create the share link" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ linkId: data.id, expiresAt: data.expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "view") {
      const { linkId } = body;
      if (!linkId || typeof linkId !== "string") {
        return new Response(JSON.stringify({ error: "linkId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: link, error: linkError } = await serviceClient
        .from("roast_share_links")
        .select("id, payload, file_name, recipient_label, expires_at")
        .eq("id", linkId)
        .maybeSingle();

      if (linkError || !link) {
        return new Response(JSON.stringify({ error: "This share link doesn't exist" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (new Date(link.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: "This share link has expired" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await serviceClient.from("roast_share_links").update({ last_viewed_at: new Date().toISOString() }).eq("id", linkId);

      return new Response(JSON.stringify({
        payload: link.payload,
        fileName: link.file_name,
        recipientLabel: link.recipient_label,
        expiresAt: link.expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Owner-side management (task #151): list the firm's live links, or kill
    // one before it expires — a brutal roast sent to the wrong partner
    // shouldn't have to wait out the 7-day expiry.
    if (action === "list") {
      const manager = await resolveManager();
      if (manager instanceof Response) return manager;
      const { data, error } = await serviceClient
        .from("roast_share_links")
        .select("id, file_name, recipient_label, expires_at, created_at")
        .eq("client_id", manager.clientId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error("roast-share-link list error:", error);
        return new Response(JSON.stringify({ error: "Couldn't list share links" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const links = (data ?? []).map((l) => ({
        id: l.id,
        fileName: l.file_name,
        recipientLabel: l.recipient_label,
        expiresAt: l.expires_at,
        createdAt: l.created_at,
      }));
      return new Response(JSON.stringify({ links }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revoke") {
      const { linkId } = body;
      if (!linkId || typeof linkId !== "string") {
        return new Response(JSON.stringify({ error: "linkId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const manager = await resolveManager();
      if (manager instanceof Response) return manager;
      // Hard delete scoped to the resolved firm — the .eq("client_id") means
      // a link id from ANOTHER firm simply matches nothing (404, no oracle),
      // and a deleted row makes the public view return the same 404 as a
      // link that never existed.
      const { data, error } = await serviceClient
        .from("roast_share_links")
        .delete()
        .eq("id", linkId)
        .eq("client_id", manager.clientId)
        .select("id");
      if (error) {
        console.error("roast-share-link revoke error:", error);
        return new Response(JSON.stringify({ error: "Couldn't revoke the share link" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!data?.length) {
        return new Response(JSON.stringify({ error: "This share link doesn't exist" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action must be create, view, list or revoke" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("roast-share-link error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
