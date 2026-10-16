// Secret-gated recovery queue for audits whose provenance recorded a
// provider outage as "missing". GET discovers both private interactive and
// public census rows; POST remeasures one row and preserves its visibility.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runVisibilityAudit } from "../_shared/runVisibilityAudit.ts";

const SYSTEM_CLIENT_ID = "ce500000-0000-4000-8000-000000000001";
const CATEGORIES = ["performance", "social", "seoAuthority", "thoughtLeadership", "reputation"];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const authorized = async (req: Request) => {
  const expected = Deno.env.get("CENSUS_BATCH_SECRET");
  if (!expected) return 503;
  const provided = req.headers.get("x-census-secret") ?? "";
  const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join("");
  return provided && (await digest(provided)) === (await digest(expected)) ? 0 : 401;
};
const missing = (provenance: unknown) => {
  const p = provenance && typeof provenance === "object" ? provenance as Record<string, unknown> : {};
  return CATEGORIES.filter((category) => p[category] === "missing");
};

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "GET or POST only" }, 405);
  const authStatus = await authorized(req);
  if (authStatus) return json({ error: authStatus === 503 ? "census batch is not configured" : "unauthorized" }, authStatus);
  const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    if (req.method === "GET") {
      const { data, error } = await serviceClient.from("market_visibility_audits")
        .select("id,audited_domain,market,display_name,peer_group,client_id,provenance,is_public")
        .order("market").order("audited_domain").limit(5000);
      if (error) return json({ error: "Couldn't discover affected audits" }, 500);
      const candidates = (data ?? []).map((row) => ({ ...row, missing: missing(row.provenance) }))
        .filter((row) => row.missing.length > 0)
        .map(({ provenance, ...row }) => row);
      return json({ total: candidates.length, candidates });
    }
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return json({ error: "id is required" }, 400);
    const { data: row, error: lookupError } = await serviceClient.from("market_visibility_audits")
      .select("id,audited_domain,market,display_name,peer_group,client_id,provenance,last_intake,is_public")
      .eq("id", id).maybeSingle();
    if (lookupError || !row) return json({ error: "Affected audit not found" }, 404);
    const before = missing(row.provenance);
    if (!before.length) return json({ id, skipped: true, beforeProvenance: row.provenance, afterProvenance: row.provenance });
    const intake = row.last_intake && typeof row.last_intake === "object" ? row.last_intake as Record<string, unknown> : {};
    const result = await runVisibilityAudit(serviceClient, {
      clientId: row.client_id,
      auditedDomain: row.audited_domain,
      displayName: row.display_name,
      market: row.market,
      peerGroup: row.peer_group,
      gbpListed: intake.gbpListed === true,
      social: intake.social,
      // Census rows are exempt from the client cap, as in the normal census
      // batch, but every row still claims the per-firm refresh lease.
      skipClientRateLimit: row.client_id === SYSTEM_CLIENT_ID,
      psiTimeoutMs: 90_000,
      psiDeadlineMs: 120_000,
    });
    if (!result.ok || !result.payload) return json({ error: result.error ?? "audit failed" }, result.status);
    if (row.is_public) {
      const { error } = await serviceClient.from("market_visibility_audits").update({ is_public: true }).eq("id", result.payload.id);
      if (error) return json({ error: "Audit completed but publish convergence failed" }, 500);
    }
    const afterProvenance = Object.fromEntries(
      Object.entries(result.payload.categories).map(([category, value]) => [category, value.provenance]),
    );
    return json({ id: result.payload.id, beforeProvenance: row.provenance, afterProvenance });
  } catch (error) {
    console.error("census-audit-remeasure-missing error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});