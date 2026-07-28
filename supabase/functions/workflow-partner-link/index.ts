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
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const CAN_MANAGE_LINK_ROLES = new Set(["owner", "admin", "marketing", "consultant", "member"]);
const MAX_VOICE_NOTE_BYTES = 5_000_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { action } = body;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    if (action === "create") {
      const { clientId: rawClientId, accessToken, itemIds, recipientLabel, expiresInDays } = body;
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

      const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

      if (accessToken && typeof accessToken === "string") {
        const { data: userData } = await serviceClient.auth.getUser(accessToken);
        if (userData?.user) {
          const { data: membership } = await serviceClient.from("firm_members").select("role").eq("user_id", userData.user.id).maybeSingle();
          if (membership?.role && !CAN_MANAGE_LINK_ROLES.has(membership.role)) {
            return new Response(JSON.stringify({ error: "Your role can't create a partner review link" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
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
      const { data: comments } = scopedItemIds.length > 0
        ? await serviceClient
          .from("battle_plan_workflow_comments")
          .select("id, item_id, author_label, body, voice_note_data_url, evidence_url, created_at")
          .in("item_id", scopedItemIds)
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
