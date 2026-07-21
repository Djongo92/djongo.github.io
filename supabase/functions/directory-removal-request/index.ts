// Public, no-password endpoint — the consent/notice mechanism for a firm
// that appears on the Directory Standing Index and wants it reviewed. Logs
// a request for manual follow-up rather than an automatic self-service
// removal, since there's no way to verify the requester actually
// represents the firm without any auth system in place.
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { DMV_MARKETS } from "../_shared/marketVisibilityConfig.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { market, firmName, note } = await req.json();
    if (!market || typeof market !== "string" || !DMV_MARKETS[market]) {
      return new Response(JSON.stringify({ error: "Unsupported market" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!firmName || typeof firmName !== "string" || !firmName.trim()) {
      return new Response(JSON.stringify({ error: "firmName is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { error } = await serviceClient.from("directory_removal_requests").insert({
      market,
      firm_name: firmName.trim().slice(0, 200),
      note: typeof note === "string" ? note.trim().slice(0, 500) || null : null,
    });

    if (error) {
      console.error("directory-removal-request insert error:", error);
      return new Response(JSON.stringify({ error: "Couldn't log the request" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("directory-removal-request error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
