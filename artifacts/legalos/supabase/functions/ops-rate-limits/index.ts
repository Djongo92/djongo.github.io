// Internal operator tooling, same posture as ops-directory-queue — reachable
// only by whoever knows the /ops/rate-limits URL, gated behind the benchmark
// scope. Read-only visibility into the three rate-limit tables
// (_shared/rateLimit.ts) so whoever operates this can tell whether the
// current thresholds are actually being hit, by whom, without needing direct
// database access.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const [teaser, directoryIndex, benchmark] = await Promise.all([
      serviceClient.from("teaser_rate_limit").select("ip_hash, window_start, request_count, updated_at").order("request_count", { ascending: false }).limit(50),
      serviceClient.from("directory_index_rate_limit").select("ip_hash, window_start, request_count, updated_at").order("request_count", { ascending: false }).limit(50),
      serviceClient.from("benchmark_rate_limit").select("client_id, window_start, request_count, updated_at").order("request_count", { ascending: false }).limit(50),
    ]);

    return new Response(JSON.stringify({
      teaser: teaser.data ?? [],
      directoryIndex: directoryIndex.data ?? [],
      benchmark: benchmark.data ?? [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ops-rate-limits error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
