// "My Library": the firm's own approved and edited Workshop outputs, listed
// as reusable templates, plus the ability to remove one. Same identity rules
// as workshop-style-feedback (guarded client id; an id a real account owns
// needs a verified token) so a firm only ever sees or removes its own.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveClientIdGuarded, headerSessionToken } from "../_shared/verifiedClientId.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "workshop");
  if (unauthorized) return unauthorized;

  try {
    const { clientId: rawClientId, accessToken, activeFirmId, action, id } = await req.json();
    if (!rawClientId || typeof rawClientId !== "string") return json({ error: "clientId is required" }, 400);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
    const clientId = await resolveClientIdGuarded(
      serviceClient, rawClientId, identityToken,
      typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined,
    );
    if (!clientId) return json({ error: "Sign in to use this feature." }, 401);

    if (action === "remove") {
      if (typeof id !== "string" || !id) return json({ error: "id is required" }, 400);
      const { error } = await serviceClient
        .from("workshop_style_examples")
        .delete()
        .eq("id", id)
        .eq("client_id", clientId);
      if (error) return json({ error: "Couldn't remove it" }, 500);
      return json({ ok: true });
    }

    const { data, error } = await serviceClient
      .from("workshop_style_examples")
      .select("id, tool_id, input_summary, final_text, verdict, voice_tag, created_at")
      .eq("client_id", clientId)
      .in("verdict", ["approved", "edited"])
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) return json({ error: "Couldn't load your library" }, 500);

    const { data: voice } = await serviceClient
      .from("workshop_voice_profiles")
      .select("profile, example_count, updated_at")
      .eq("client_id", clientId)
      .maybeSingle();

    return json({ items: data ?? [], voiceProfile: voice ?? null });
  } catch (e) {
    console.error("workshop-library error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
