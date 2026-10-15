// §8 — Workflow: a single-purpose, expiring mobile link so a partner who
// won't install anything or log in can review, comment (including a
// recorded voice note), and approve workflow items from their phone. The
// link id itself is the bearer token — same posture as create-share's
// shared_artifacts — but unlike that table, battle_plan_partner_links has
// no anon RLS grant at all: workflow items are a firm's internal action
// plan, more sensitive than a shareable score card, so even the token-
// gated read goes through this service-role function rather than a direct
// anon SELECT (see the workflow migration's comment for the same reasoning
// CLAUDE.md already applied to market_visibility_audits).
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { resolveLinkManagerRole } from "../_shared/firmRoleGate.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const MAX_VOICE_NOTE_BYTES = 5_000_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    // Authorization splits by action, so it has to happen after the body is
    // parsed rather than as up-front middleware. view/comment/approve are
    // public by design — the link id is the bearer token and the whole point
    // is that a partner never logs in. "create" mints those links against a
    // caller-supplied clientId, so it must prove a real session first;
    // otherwise anyone could forge a review link for any firm they can guess.
    if (action === "create") {
      const unauthorized = await requireAccess(req, corsHeaders, "any");
      if (unauthorized) return unauthorized;
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    if (action === "create") {
      const { clientId: rawClientId, accessToken, activeFirmId, itemIds, recipientLabel, expiresInDays } = body;
      if (!rawClientId || typeof rawClientId !== "string") {
        return new Response(JSON.stringify({ error: "clientId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return new Response(JSON.stringify({ error: "itemIds must be a non-empty array" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Strict identity: minting a review link is a signed-in-member action
      // (view/comment/approve below stay linkId-authorized), so a
      // missing/unverifiable token is a 401 — never a fallback to the
      // caller-asserted clientId, which would let anyone forge a review
      // link for any firm whose id they know.
      const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
      const clientId = await resolveVerifiedClientId(serviceClient, identityToken, typeof activeFirmId === "string" ? activeFirmId : undefined);
      if (!clientId) {
        return new Response(JSON.stringify({ error: "Sign in to use this feature." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Role gate via the shared helper: scoped to BOTH user and resolved
      // firm, failing closed — the user-only maybeSingle that used to live
      // here silently authorized multi-firm users (code review on #136).
      // identityToken is guaranteed present (resolveVerifiedClientId fails
      // closed above), so the re-verify and the gate are UNCONDITIONAL:
      // wrapping them in `if (userData?.user)` would fail OPEN on a
      // transient getUser error and mint the link anyway.
      const { data: userData } = await serviceClient.auth.getUser(identityToken);
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: "Sign in to create a review link." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const gate = await resolveLinkManagerRole(serviceClient, userData.user.id, clientId);
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: gate.error }), {
          status: gate.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ownership check — every requested item must belong to this client.
      const { data: ownedItems } = await serviceClient
        .from("battle_plan_workflow_items")
        .select("id")
        .eq("client_id", clientId)
        .in("id", itemIds);
      const ownedIds = (ownedItems ?? []).map((i) => i.id);
      if (ownedIds.length === 0) {
        return new Response(JSON.stringify({ error: "None of those items belong to you" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const days = Number.isFinite(Number(expiresInDays)) && Number(expiresInDays) > 0 ? Math.min(Number(expiresInDays), 30) : 7;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await serviceClient
        .from("battle_plan_partner_links")
        .insert({
          client_id: clientId,
          item_ids: ownedIds,
          recipient_label: typeof recipientLabel === "string" ? recipientLabel.trim() || null : null,
          expires_at: expiresAt,
        })
        .select("id, expires_at")
        .single();

      if (error || !data) {
        console.error("workflow-partner-link create error:", error);
        return new Response(JSON.stringify({ error: "Couldn't create the review link" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ linkId: data.id, expiresAt: data.expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Every action below is authorized purely by possession of a valid,
    // unexpired linkId — this is the whole point: no login.
    const { linkId } = body;
    if (!linkId || typeof linkId !== "string") {
      return new Response(JSON.stringify({ error: "linkId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: link, error: linkError } = await serviceClient
      .from("battle_plan_partner_links")
      .select("id, client_id, item_ids, recipient_label, expires_at")
      .eq("id", linkId)
      .maybeSingle();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: "This review link doesn't exist" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(link.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "This review link has expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopedItemIds: string[] = Array.isArray(link.item_ids) ? link.item_ids : [];

    if (action === "view") {
      const { data: items } = await serviceClient
        .from("battle_plan_workflow_items")
        .select("id, title, description, status, due_date, source, source_ref")
        .in("id", scopedItemIds);
      // §11 — an external partner must never see a consultant's internal
      // notes, so this filters to client-visible comments only, unlike the
      // in-app workflow-items-manage list (which the consultant themselves
      // can see everything through).
      const { data: comments } = scopedItemIds.length > 0
        ? await serviceClient
          .from("battle_plan_workflow_comments")
          .select("id, item_id, author_label, body, voice_note_data_url, evidence_url, created_at")
          .in("item_id", scopedItemIds)
          .eq("visibility", "client")
          .order("created_at", { ascending: true })
        : { data: [] };

      await serviceClient.from("battle_plan_partner_links").update({ last_viewed_at: new Date().toISOString() }).eq("id", linkId);

      return new Response(JSON.stringify({
        recipientLabel: link.recipient_label,
        expiresAt: link.expires_at,
        items: items ?? [],
        comments: comments ?? [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "comment") {
      const { itemId, body: commentBody, voiceNoteDataUrl } = body;
      if (!itemId || typeof itemId !== "string" || !scopedItemIds.includes(itemId)) {
        return new Response(JSON.stringify({ error: "That item isn't part of this review link" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const hasBody = typeof commentBody === "string" && commentBody.trim().length > 0;
      const hasVoice = typeof voiceNoteDataUrl === "string" && voiceNoteDataUrl.length > 0;
      if (!hasBody && !hasVoice) {
        return new Response(JSON.stringify({ error: "A comment needs text or a voice note" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (hasVoice && voiceNoteDataUrl.length > MAX_VOICE_NOTE_BYTES) {
        return new Response(JSON.stringify({ error: "That recording is too long" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await serviceClient
        .from("battle_plan_workflow_comments")
        .insert({
          item_id: itemId,
          author_label: link.recipient_label ? `${link.recipient_label} (external review)` : "External review",
          author_user_id: null,
          body: hasBody ? commentBody.trim() : null,
          voice_note_data_url: hasVoice ? voiceNoteDataUrl : null,
        })
        .select("*")
        .single();

      if (error || !data) {
        console.error("workflow-partner-link comment error:", error);
        return new Response(JSON.stringify({ error: "Couldn't add the comment" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ comment: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const { itemId } = body;
      if (!itemId || typeof itemId !== "string" || !scopedItemIds.includes(itemId)) {
        return new Response(JSON.stringify({ error: "That item isn't part of this review link" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await serviceClient
        .from("battle_plan_workflow_items")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("client_id", link.client_id)
        .select("id, status")
        .single();
      if (error || !data) {
        console.error("workflow-partner-link approve error:", error);
        return new Response(JSON.stringify({ error: "Couldn't approve the item" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action must be create, view, comment, or approve" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("workflow-partner-link error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
