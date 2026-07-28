// §8 — Workflow: add a comment (text and/or a recorded voice note) or
// evidence link to a workflow item, from a signed-in member. The anonymous
// partner-link flow is handled separately by workflow-partner-link — that
// caller never has a Supabase Auth session, so it can't reuse this
// function's identity resolution.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const CAN_COMMENT_ROLES = new Set(["owner", "admin", "marketing", "member", "consultant", "partner"]);
// A voice note is a base64 data URL — cap it well above a typical minute of
// compressed speech (a few hundred KB) but far below anything that'd bloat
// the row unreasonably, since there's no object storage backing this (see
// the workflow migration's comment for why).
const MAX_VOICE_NOTE_BYTES = 5_000_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, activeFirmId, itemId, body: commentBody, voiceNoteDataUrl, evidenceUrl, visibility } = await req.json();
    const commentVisibility = visibility === "internal" ? "internal" : "client";

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!itemId || typeof itemId !== "string") {
      return new Response(JSON.stringify({ error: "itemId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken, typeof activeFirmId === "string" ? activeFirmId : undefined);

    let userId: string | null = null;
    let authorLabel = "Team member";
    let finalVisibility = commentVisibility;
    if (accessToken && typeof accessToken === "string") {
      const { data: userData } = await serviceClient.auth.getUser(accessToken);
      if (userData?.user) {
        userId = userData.user.id;
        authorLabel = userData.user.email ?? authorLabel;
        const { data: membership } = await serviceClient.from("firm_members").select("role").eq("user_id", userId).maybeSingle();
        if (membership?.role && !CAN_COMMENT_ROLES.has(membership.role)) {
          return new Response(JSON.stringify({ error: "Your role can't comment on workflow items" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // §11 — only a consultant can mark a note "internal" (hidden from
        // the client firm's own team); anyone else's attempt is silently
        // downgraded to client-visible rather than erroring, since it's a
        // sensible default, not a real mistake worth blocking on.
        if (finalVisibility === "internal" && membership?.role !== "consultant") {
          finalVisibility = "client";
        }
      }
    }

    // Ownership check — the item must belong to this client before a
    // comment can be attached, never trusting a bare itemId from the client.
    const { data: item } = await serviceClient
      .from("battle_plan_workflow_items")
      .select("id")
      .eq("id", itemId)
      .eq("client_id", clientId)
      .maybeSingle();
    if (!item) {
      return new Response(JSON.stringify({ error: "Workflow item not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await serviceClient
      .from("battle_plan_workflow_comments")
      .insert({
        item_id: itemId,
        author_label: authorLabel,
        author_user_id: userId,
        body: hasBody ? commentBody.trim() : null,
        voice_note_data_url: hasVoice ? voiceNoteDataUrl : null,
        evidence_url: typeof evidenceUrl === "string" && evidenceUrl.trim() ? evidenceUrl.trim() : null,
        visibility: finalVisibility,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("workflow-comment-add error:", error);
      return new Response(JSON.stringify({ error: "Couldn't add the comment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ comment: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("workflow-comment-add error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
