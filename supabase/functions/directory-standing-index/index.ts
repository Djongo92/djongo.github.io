// Public, no-password Directory Standing Index — the entire point is that
// it needs zero audit participation: every firm in market_directory_data
// gets a real Chambers/Legal 500/IFLR1000-derived number today, computed
// straight from already-licensed directory data. IP-rate-limited (its own,
// generous bucket — see directory_index_rate_limit) rather than
// access-token-gated, since this makes no external paid API calls.
import { ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { clientIpFrom, checkDirectoryIndexRateLimit } from "../_shared/rateLimit.ts";
import { computeDirectoryStandingIndex, DIRECTORY_INDEX_MAX } from "../_shared/directoryStandingIndex.ts";
import type { DirectoryRow } from "../_shared/reputationScore.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { market } = await req.json();
    if (!market || typeof market !== "string") {
      return new Response(JSON.stringify({ error: "market is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const ip = clientIpFrom(req);
    const { allowed } = await checkDirectoryIndexRateLimit(serviceClient, ip);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a few minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await serviceClient
      .from("market_directory_data")
      .select("firm_name, firm_domain, firm_type, chambers, legal500, iflr1000")
      .eq("market", market);

    if (error || !data) {
      console.error("directory-standing-index query error:", error);
      return new Response(JSON.stringify({ error: "Couldn't load directory data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firms = computeDirectoryStandingIndex(market, data as DirectoryRow[]);

    return new Response(JSON.stringify({ market, max: DIRECTORY_INDEX_MAX, firms }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("directory-standing-index error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
