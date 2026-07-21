// Re-keys a browser's anonymous client_id rows to a real, just-authenticated
// user's id. market_visibility_audits' client_id column has never assumed a
// real auth.uid() — it's the same random-per-browser id firm_benchmarks
// uses — so a real account re-uses that column rather than adding a new
// one: client_id = auth.uid() once a user is signed in. This function is
// what performs the one-time handoff from "anonymous browser" to "real
// account" for whatever audit(s) that browser already ran.
//
// Identity is verified server-side from the caller's real Supabase session
// access token (never trusted from the request body) via
// serviceClient.auth.getUser(accessToken). market_visibility_audits has a
// UNIQUE(client_id, audited_domain, market) constraint, so rows are re-keyed
// one at a time and a collision (the real account already has an audit for
// that domain+market) is skipped rather than failing the whole claim.
// market_visibility_audit_history has no such constraint, so it's re-keyed
// in a single statement.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { anonymousClientId, accessToken } = await req.json();

    if (!anonymousClientId || typeof anonymousClientId !== "string") {
      return new Response(JSON.stringify({ error: "anonymousClientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!accessToken || typeof accessToken !== "string") {
      return new Response(JSON.stringify({ error: "accessToken is required" }), {
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

    if (userId === anonymousClientId) {
      return new Response(JSON.stringify({ claimed: 0, skipped: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rows, error: rowsError } = await serviceClient
      .from("market_visibility_audits")
      .select("id")
      .eq("client_id", anonymousClientId);

    if (rowsError) {
      console.error("visibility-audit-claim lookup error:", rowsError);
      return new Response(JSON.stringify({ error: "Couldn't look up your existing audits" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let claimed = 0;
    let skipped = 0;
    for (const row of rows ?? []) {
      const { error } = await serviceClient
        .from("market_visibility_audits")
        .update({ client_id: userId })
        .eq("id", row.id);
      if (error) skipped++;
      else claimed++;
    }

    const { error: historyError } = await serviceClient
      .from("market_visibility_audit_history")
      .update({ client_id: userId })
      .eq("client_id", anonymousClientId);
    if (historyError) console.error("visibility-audit-claim history error:", historyError);

    return new Response(JSON.stringify({ claimed, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-claim error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
