// Deploy before going live: supabase functions deploy insight-rate
// --project-ref <ref> --no-verify-jwt --use-api (see ../README.md).
// Insight usefulness feedback (task #127): firms rate Network Insights cards
// useful / not-useful so weak templates can be tuned or retired as the
// dataset grows. Ratings are per firm (client_id + insight_key upsert) and
// session-only fail-closed — insights themselves are account-only, so an
// anonymous rating would be meaningless. The table has no anon/authenticated
// grant; every read/write goes through this service-role function.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const VALID_RATINGS = new Set(["useful", "not_useful"]);
// Keys are the template keys emitted by _shared/networkInsights.ts; the cap
// exists so a rogue caller can't stuff the table with unbounded junk rows.
const MAX_KEY_LEN = 80;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const unauthorized = await requireAccess(req, corsHeaders, "any");
    if (unauthorized) return unauthorized;

    const body = await req.json();
    const { action } = body;

    // Fail-closed identity: rating is a signed-in-member action, so a
    // missing/unverifiable token is a 401 — never the caller-asserted id.
    const identityToken =
      typeof body.accessToken === "string" && body.accessToken ? body.accessToken : headerSessionToken(req);
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const clientId = await resolveVerifiedClientId(
      serviceClient,
      identityToken,
      typeof body.activeFirmId === "string" ? body.activeFirmId : undefined,
    );
    if (!clientId) {
      return json({ error: "Sign in to use this feature." }, 401);
    }

    if (action === "list") {
      const { data, error } = await serviceClient
        .from("insight_ratings")
        .select("insight_key, rating")
        .eq("client_id", clientId);
      if (error) {
        console.error("insight-rate list error:", error);
        return json({ error: "Couldn't load ratings" }, 500);
      }
      const ratings: Record<string, string> = {};
      for (const row of data ?? []) ratings[row.insight_key] = row.rating;
      return json({ ratings });
    }

    if (action === "rate") {
      const { insightKey, rating } = body;
      if (typeof insightKey !== "string" || !insightKey.trim() || insightKey.length > MAX_KEY_LEN) {
        return json({ error: "insightKey is required" }, 400);
      }
      const key = insightKey.trim();

      if (rating === null) {
        // Clicking the active rating clears it.
        const { error } = await serviceClient
          .from("insight_ratings")
          .delete()
          .eq("client_id", clientId)
          .eq("insight_key", key);
        if (error) {
          console.error("insight-rate clear error:", error);
          return json({ error: "Couldn't clear the rating" }, 500);
        }
        return json({ ok: true, rating: null });
      }

      if (!VALID_RATINGS.has(rating)) {
        return json({ error: "rating must be 'useful', 'not_useful', or null" }, 400);
      }
      const { error } = await serviceClient
        .from("insight_ratings")
        .upsert(
          { client_id: clientId, insight_key: key, rating, updated_at: new Date().toISOString() },
          { onConflict: "client_id,insight_key" },
        );
      if (error) {
        console.error("insight-rate upsert error:", error);
        return json({ error: "Couldn't save the rating" }, 500);
      }
      return json({ ok: true, rating });
    }

    return json({ error: "action must be list or rate" }, 400);
  } catch (e) {
    console.error("insight-rate error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
