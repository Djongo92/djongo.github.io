import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
/**
 * Create a public read-only share link for any AI artifact.
 * POST { kind, title, payload, sourceUrl?, expiresInDays? } → { id, url }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

const VALID_KINDS = new Set([
  "roast", "autopsy", "audit", "teardown", "headline", "bio",
  "maturity", "roadmap", "pitch", "calendar", "copy",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  

    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;try {
    const { kind, title, payload, sourceUrl, expiresInDays } = await req.json();

    if (!kind || typeof kind !== "string" || !VALID_KINDS.has(kind)) {
      return new Response(JSON.stringify({ error: "Invalid kind" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!title || typeof title !== "string" || title.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid title" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!payload || typeof payload !== "object") {
      return new Response(JSON.stringify({ error: "Missing payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Size guard — keep DB lean.
    const serialized = JSON.stringify(payload);
    if (serialized.length > 200_000) {
      return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const expires_at = typeof expiresInDays === "number" && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
      : null;

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await client
      .from("shared_artifacts")
      .insert({ kind, title: title.trim(), payload, source_url: sourceUrl ?? null, expires_at })
      .select("id")
      .single();

    if (error) {
      console.error("create-share insert error:", error);
      return new Response(JSON.stringify({ error: "Couldn't create share link" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-share error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});