import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { computeSocialScore, type SocialInput } from "../_shared/socialScore.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { market, peerGroup, followers, posts30d, engagementRate, platforms } = await req.json();
    if (!market || typeof market !== "string" || !peerGroup || typeof peerGroup !== "string") {
      return new Response(JSON.stringify({ error: "market and peerGroup are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input: SocialInput = {
      followers: Number(followers) || 0,
      posts30d: Number(posts30d) || 0,
      engagementRate: typeof engagementRate === "number" ? engagementRate : undefined,
      platforms: {
        linkedin: platforms?.linkedin === true,
        instagram: platforms?.instagram === true,
        twitter: platforms?.twitter === true,
        facebook: platforms?.facebook === true,
      },
    };

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const result = await computeSocialScore(serviceClient, market, peerGroup, input);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-social error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
