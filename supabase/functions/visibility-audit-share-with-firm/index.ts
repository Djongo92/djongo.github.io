// Re-keys a caller's existing audits from their personal client_id to their
// firm's shared client_id, so a firm that just gained a second member can
// see one audit history instead of whoever ran it first owning it alone.
//
// Only makes sense once the firm actually has >1 member — resolveClientId's
// firm-awareness only kicks in at that point too, so this is the one-time
// migration step that lines a solo account's past audits up with the shared
// identity every future audit call will already resolve to.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { accessToken } = await req.json();

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

    const { data: memberFirms, error: memberFirmsError } = await serviceClient
      .from("firm_members")
      .select("firm_id")
      .eq("user_id", userId);
    if (memberFirmsError) {
      console.error("visibility-audit-share-with-firm membership lookup error:", memberFirmsError);
      return new Response(JSON.stringify({ error: "Couldn't look up your firm" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let firmId: string | null = null;
    for (const { firm_id } of memberFirms ?? []) {
      const { count, error: countError } = await serviceClient
        .from("firm_members")
        .select("*", { count: "exact", head: true })
        .eq("firm_id", firm_id);
      if (countError) {
        console.error("visibility-audit-share-with-firm count error:", countError);
        continue;
      }
      if ((count ?? 0) > 1) {
        firmId = firm_id;
        break;
      }
    }

    if (!firmId) {
      return new Response(JSON.stringify({ error: "You don't belong to a firm with any other members yet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ownAudits, error: ownAuditsError } = await serviceClient
      .from("market_visibility_audits")
      .select("id")
      .eq("client_id", userId);
    if (ownAuditsError) {
      console.error("visibility-audit-share-with-firm audit lookup error:", ownAuditsError);
      return new Response(JSON.stringify({ error: "Couldn't look up your audits" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let shared = 0;
    let skipped = 0;
    for (const { id } of ownAudits ?? []) {
      const { error: updateError } = await serviceClient
        .from("market_visibility_audits")
        .update({ client_id: firmId })
        .eq("id", id)
        .eq("client_id", userId);
      if (updateError) {
        // Most likely the (client_id, audited_domain, market) unique
        // constraint — the firm already has its own audit for that
        // domain/market. Leave the personal row as-is rather than failing
        // the whole batch.
        skipped++;
      } else {
        shared++;
      }
    }

    await serviceClient
      .from("market_visibility_audit_history")
      .update({ client_id: firmId })
      .eq("client_id", userId);

    return new Response(JSON.stringify({ shared, skipped, firmId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-share-with-firm error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
