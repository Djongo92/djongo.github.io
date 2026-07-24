// Creates or updates one of a client's campaigns (see campaigns migration).
// No id in the body -> insert; id present -> update, scoped by client_id so
// a client can never touch another client's row even if it guessed an id.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientId } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const VALID_STATUSES = ["planned", "live", "done"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  try {
    const {
      clientId: rawClientId, accessToken, id, market, auditedDomain, name, status, startedAt, endedAt, linkedRuns,
    } = await req.json();

    if (!rawClientId || typeof rawClientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ error: "Unsupported status" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const clientId = await resolveClientId(serviceClient, rawClientId, accessToken);

    if (id && typeof id === "string") {
      const patch: Record<string, unknown> = { name: name.trim(), updated_at: new Date().toISOString() };
      if (status !== undefined) patch.status = status;
      if (startedAt !== undefined) patch.started_at = startedAt;
      if (endedAt !== undefined) patch.ended_at = endedAt;
      if (linkedRuns !== undefined) patch.linked_runs = linkedRuns;

      const { data, error } = await serviceClient
        .from("campaigns")
        .update(patch)
        .eq("id", id)
        .eq("client_id", clientId)
        .select()
        .maybeSingle();

      if (error || !data) {
        console.error("campaigns-save (update) error:", error);
        return new Response(JSON.stringify({ error: "Couldn't update campaign" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ campaign: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!market || typeof market !== "string" || !auditedDomain || typeof auditedDomain !== "string") {
      return new Response(JSON.stringify({ error: "market and auditedDomain are required to create a campaign" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await serviceClient
      .from("campaigns")
      .insert({
        client_id: clientId,
        market,
        audited_domain: auditedDomain,
        name: name.trim(),
        status: status ?? "planned",
        started_at: startedAt ?? null,
        ended_at: endedAt ?? null,
        linked_runs: linkedRuns ?? [],
      })
      .select()
      .single();

    if (error) {
      console.error("campaigns-save (insert) error:", error);
      return new Response(JSON.stringify({ error: "Couldn't create campaign" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ campaign: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("campaigns-save error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
