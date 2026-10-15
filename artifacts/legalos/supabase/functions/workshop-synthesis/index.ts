// Deploy before going live: supabase functions deploy workshop-synthesis
// --project-ref <ref> --no-verify-jwt --use-api (see ../README.md).
// Post-run synthesis: the client fires this fire-and-forget after every
// workshop run completes. It verifies the session FAIL-CLOSED (synthesis is
// account-only — anonymous/demo runs have no firm profile to grow),
// acknowledges immediately (202), then distils a structured note from the
// run output and appends it to firm_profiles.synthesis_notes in the
// background via EdgeRuntime.waitUntil. The user never waits for it, and a
// failure here can never surface to them.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { resolveVerifiedClientId } from "../_shared/verifiedClientId.ts";
import { checkSynthesisRateLimit } from "../_shared/rateLimit.ts";
import { runSynthesis } from "../_shared/postRunSynthesis.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

/** Run background work past the response — EdgeRuntime.waitUntil on Supabase. */
function waitUntil(p: Promise<unknown>): void {
  try {
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(p);
    p.catch((e: unknown) => console.error("workshop-synthesis background error:", e));
  } catch {
    p.catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "any");
  if (unauthorized) return unauthorized;

  const ack = (body: Record<string, unknown>, status = 202) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { accessToken, activeFirmId, toolId, toolLabel, output } = await req.json();

    if (typeof output !== "string" || !output.trim() || typeof toolId !== "string" || !toolId) {
      return ack({ skipped: "nothing to synthesise" });
    }
    if (typeof accessToken !== "string" || !accessToken) {
      return ack({ skipped: "no session — synthesis is account-only" });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Fail-closed: the note is written ONLY to the firm the session proves
    // membership in, honouring the activeFirmId workspace pin. A bogus or
    // foreign pin yields null and the call becomes a silent no-op.
    const firmId = await resolveVerifiedClientId(
      serviceClient,
      accessToken,
      typeof activeFirmId === "string" ? activeFirmId : undefined,
    );
    if (!firmId) return ack({ skipped: "unverified identity" });

    // Per-firm throttle: one synthesis per workshop run is the product
    // flow, but this endpoint is directly callable with any session —
    // without a cap that's unbounded Haiku spend. Over-limit runs are
    // silently skipped (synthesis is advisory memory, never worth an error).
    const { allowed } = await checkSynthesisRateLimit(serviceClient, firmId);
    if (!allowed) return ack({ skipped: "rate limited" });

    waitUntil(
      runSynthesis(
        serviceClient,
        firmId,
        toolId,
        typeof toolLabel === "string" && toolLabel ? toolLabel : toolId,
        output,
      ),
    );
    return ack({ queued: true });
  } catch (e) {
    console.error("workshop-synthesis error:", e);
    return ack({ queued: false }, 200); // never make the client care
  }
});
