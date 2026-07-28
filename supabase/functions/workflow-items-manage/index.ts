// §8 — Workflow: list/create/update/delete Battle Plan workflow items.
// Identity resolved server-side from the caller's real Supabase Auth access
// token (never trusted from the request body) — same posture as
// firm-profile/campaigns-save. Ownership is scoped by client_id, resolved
// the same way every other audit-adjacent table resolves it (solo account's
// own auth.uid(), or a firm's shared id once it has >1 member).
//
// Permission model: creating/editing/commenting/re-measuring an item needs
// canComment (broadest — everyone except a read-only executive); moving an
// item to "approved" needs canApproveWorkflow (owner/admin/partner only) —
// the two role flags src/lib/roles.ts defined ahead of this feature, used
// here for the first time.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

const CAN_COMMENT_ROLES = new Set(["owner", "admin", "marketing", "member", "consultant", "partner"]);
const CAN_APPROVE_ROLES = new Set(["owner", "admin", "partner"]);
const VALID_STATUSES = new Set(["todo", "in_progress", "in_review", "approved", "done"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { clientId: rawClientId, accessToken, action } = body;

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["list", "create", "update", "delete"].includes(action)) {
      return new Response(JSON.stringify({ error: "action must be list, create, update, or delete" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    let userId: string | null = null;
    let role: string | null = null;
    if (accessToken && typeof accessToken === "string") {
      const { data: userData } = await serviceClient.auth.getUser(accessToken);
      if (userData?.user) {
        userId = userData.user.id;
        const { data: membership } = await serviceClient.from("firm_members").select("role").eq("user_id", userId).maybeSingle();
        role = membership?.role ?? null;
      }
    }
    // A solo account (no firm membership row) is unambiguously acting on
    // their own items — no role nuance applies, same reasoning as
    // firm-profile's ownership check.
    const canComment = !role || CAN_COMMENT_ROLES.has(role);
    const canApprove = !role || CAN_APPROVE_ROLES.has(role);

    if (action === "list") {
      const { data: items, error } = await serviceClient
        .from("battle_plan_workflow_items")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("workflow-items-manage list error:", error);
        return new Response(JSON.stringify({ error: "Couldn't load workflow items" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const itemIds = (items ?? []).map((i) => i.id);
      let comments: unknown[] = [];
      if (itemIds.length > 0) {
        const { data: commentRows } = await serviceClient
          .from("battle_plan_workflow_comments")
          .select("*")
          .in("item_id", itemIds)
          .order("created_at", { ascending: true });
        comments = commentRows ?? [];
      }
      return new Response(JSON.stringify({ items: items ?? [], comments }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      if (!canComment) {
        return new Response(JSON.stringify({ error: "Your role can't create workflow items" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { title, description, source, sourceRef, dueDate, assignedToUserId, assignedToLabel } = body;
      if (!title || typeof title !== "string" || !title.trim()) {
        return new Response(JSON.stringify({ error: "title is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await serviceClient
        .from("battle_plan_workflow_items")
        .insert({
          client_id: clientId,
          title: title.trim(),
          description: typeof description === "string" ? description.trim() || null : null,
          source: source === "roadmap_action" ? "roadmap_action" : "custom",
          source_ref: sourceRef ?? null,
          due_date: typeof dueDate === "string" && dueDate ? dueDate : null,
          assigned_to_user_id: typeof assignedToUserId === "string" ? assignedToUserId : null,
          assigned_to_label: typeof assignedToLabel === "string" ? assignedToLabel.trim() || null : null,
          created_by: userId,
        })
        .select("*")
        .single();
      if (error || !data) {
        console.error("workflow-items-manage create error:", error);
        return new Response(JSON.stringify({ error: "Couldn't create the workflow item" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { id, patch } = body;
      if (!id || typeof id !== "string" || !patch || typeof patch !== "object") {
        return new Response(JSON.stringify({ error: "id and patch are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (patch.status === "approved" && !canApprove) {
        return new Response(JSON.stringify({ error: "Your role can't approve workflow items" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (patch.status !== undefined && patch.status !== "approved" && !canComment) {
        return new Response(JSON.stringify({ error: "Your role can't update workflow items" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (patch.status !== undefined && !VALID_STATUSES.has(patch.status)) {
        return new Response(JSON.stringify({ error: "Invalid status" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const allowed: Record<string, unknown> = {};
      for (const field of ["title", "description", "due_date", "assigned_to_user_id", "assigned_to_label", "status"]) {
        const camel = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (patch[camel] !== undefined) allowed[field] = patch[camel];
      }
      allowed.updated_at = new Date().toISOString();

      const { data, error } = await serviceClient
        .from("battle_plan_workflow_items")
        .update(allowed)
        .eq("id", id)
        .eq("client_id", clientId) // ownership check — never trust a bare id from the client
        .select("*")
        .single();
      if (error || !data) {
        console.error("workflow-items-manage update error:", error);
        return new Response(JSON.stringify({ error: "Couldn't update the workflow item" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "delete"
    const { id } = body;
    if (!id || typeof id !== "string") {
      return new Response(JSON.stringify({ error: "id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!canComment) {
      return new Response(JSON.stringify({ error: "Your role can't delete workflow items" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error: deleteError } = await serviceClient
      .from("battle_plan_workflow_items")
      .delete()
      .eq("id", id)
      .eq("client_id", clientId);
    if (deleteError) {
      console.error("workflow-items-manage delete error:", deleteError);
      return new Response(JSON.stringify({ error: "Couldn't delete the workflow item" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("workflow-items-manage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
