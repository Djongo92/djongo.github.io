// Census batch runner — secret-guarded, server-to-server endpoint that runs
// the full Market Visibility audit for ONE census firm per invocation and
// PUBLISHES the result so the Serbia leaderboard + peer statistics reflect
// the whole market, not just self-serve signups.
//
// Why this exists separately from visibility-audit-run:
//   - Auth: visibility-audit-run requires a user JWT / benchmark HMAC token
//     and resolves identity to a real account. A 90-firm market batch is not
//     a user action — it runs under a dedicated system clientId below, behind
//     a shared secret (CENSUS_BATCH_SECRET) instead of account auth.
//   - Rate limit: the per-client daily audit cap (20/24h) exists to stop a
//     leaked password from turning into runaway spend. The batch is intended
//     spend, so it passes skipRateLimit — a parameter the HTTP handler of
//     visibility-audit-run never forwards, so only this in-process path can
//     set it.
//   - Publish: the table default is_public=false is right for self-serve
//     intake; census rows exist to be the public market dataset, so this
//     path publishes on creation (and self-heals the flag on reuse).
//
// Idempotency: one audit per (system client, domain, market) — a re-run for
// an already-audited domain returns the existing row unless {force: true}.
// A crashed driver script therefore converges instead of duplicating spend.
// The driver lives at scripts/census/run-census-audits.mjs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runVisibilityAudit, VALID_PEER_GROUPS } from "../_shared/runVisibilityAudit.ts";

// Dedicated identity for census-run audits. Keeps batch rows out of every
// real client's workspace (the upsert conflict key is
// client_id+audited_domain+market) and makes the whole batch identifiable
// and deletable as a unit.
const CENSUS_SYSTEM_CLIENT_ID = "ce500000-0000-4000-8000-000000000001";
const MARKET = "serbia"; // only supported market — see _shared/marketVisibilityConfig.ts

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  // No browser caller exists — no CORS surface is exposed.
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Fail-closed: an unconfigured secret means the endpoint is dead, not open.
  const expected = Deno.env.get("CENSUS_BATCH_SECRET");
  if (!expected) return json({ error: "census batch is not configured" }, 503);
  const provided = req.headers.get("x-census-secret") ?? "";
  // Hash-then-compare: fixed-length inputs keep the equality check from
  // leaking length or prefix information via timing.
  if (!provided || (await sha256Hex(provided)) !== (await sha256Hex(expected))) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const auditedDomain = typeof body.auditedDomain === "string" ? body.auditedDomain.trim().toLowerCase() : "";
    if (!/^[a-z0-9.-]+\.[a-z0-9-]{2,}$/.test(auditedDomain)) {
      return json({ error: "auditedDomain must be a bare domain (no scheme or path)" }, 400);
    }
    const peerGroup = typeof body.peerGroup === "string" ? body.peerGroup : "";
    if (!VALID_PEER_GROUPS.has(peerGroup)) return json({ error: "Invalid peerGroup" }, 400);
    const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim() : null;
    const firmSize = typeof body.firmSize === "string" ? body.firmSize : undefined;
    const force = body.force === true;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: existing, error: lookupError } = await serviceClient
      .from("market_visibility_audits")
      .select("id, total_score, is_public")
      .eq("client_id", CENSUS_SYSTEM_CLIENT_ID)
      .eq("audited_domain", auditedDomain)
      .eq("market", MARKET)
      .maybeSingle();
    if (lookupError) console.error("census-audit-run lookup error:", lookupError);

    if (existing && !force) {
      if (!existing.is_public) {
        // A previous pass crashed between run and publish — converge now.
        const { error: convergeError } = await serviceClient
          .from("market_visibility_audits")
          .update({ is_public: true })
          .eq("id", existing.id);
        if (convergeError) {
          // Never report a still-private row as published — fail so the
          // driver records the failure and a re-run converges it.
          console.error("census-audit-run converge-publish error:", convergeError);
          return json(
            { error: "existing audit is still private and publish failed — retry this domain", auditId: existing.id },
            500,
          );
        }
      }
      return json({ id: existing.id, totalScore: existing.total_score, isPublic: true, reused: true });
    }

    const result = await runVisibilityAudit(serviceClient, {
      clientId: CENSUS_SYSTEM_CLIENT_ID,
      auditedDomain,
      displayName,
      market: MARKET,
      peerGroup,
      gbpListed: false,
      firmSize,
      skipRateLimit: true,
      // Batch budget: some firm sites answer Lighthouse in 45-65s — well past
      // the live path's 25s. A census run can afford to wait, but the total
      // deadline keeps a worst-case 4-attempt matrix inside the edge budget,
      // with headroom for persistence after PSI completes.
      psiTimeoutMs: 90_000,
      psiDeadlineMs: 120_000,
    });
    if (!result.ok || !result.payload) return json({ error: result.error ?? "audit failed" }, result.status);

    const { error: publishError } = await serviceClient
      .from("market_visibility_audits")
      .update({ is_public: true })
      .eq("id", result.payload.id);
    if (publishError) {
      console.error("census-audit-run publish error:", publishError);
      return json(
        { error: "audit completed but publishing failed — re-run this domain to self-heal", auditId: result.payload.id },
        500,
      );
    }

    return json({ ...result.payload, isPublic: true, reused: false });
  } catch (e) {
    console.error("census-audit-run error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
