// Task #199 — weekly health probe for the regional trade-press outlet
// registry. The Monday 05:30 UTC cron wrapper (migration 20260814000000)
// calls this with the Vault-backed x-cron-secret; every registered outlet is
// queried for a firm with known historical coverage and the result is logged
// to public.press_outlet_health. Any dead outlet fails the run (HTTP 500 →
// cron.job_run_details + edge function logs) instead of silently reverting
// the press axis to undercounting.
//
// Deploy: npx -y supabase@latest functions deploy press-outlets-health \
//   --project-ref <ref> --no-verify-jwt --use-api   (see functions/README.md)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  REGIONAL_TRADE_OUTLETS,
  buildOutletUrl,
  withOutletSource,
} from "../_shared/regionalTradePressFormula.ts";
import { parseRssItems } from "../_shared/pressMentionsFormula.ts";
import {
  probeError,
  probeFromItems,
  probeHttpFailure,
  summarizeOutletHealth,
  type OutletProbe,
} from "./outletHealth.ts";
import { withCronAlert } from "../_shared/cronAlert.ts";

// Same firm and UA as the vitest smoke — the assertion is "the strategy
// still returns parseable items", and the probe must exercise the exact UA
// the production fetch sends (edge-fetch policy: self-identify first).
const KNOWN_COVERED_FIRM = "BDK Advokati";
const UA = "Mozilla/5.0 (compatible; LegalOS/1.0)";
const FETCH_TIMEOUT_MS = 15_000;

async function probeOutlet(outlet: (typeof REGIONAL_TRADE_OUTLETS)[number]): Promise<OutletProbe> {
  const url = buildOutletUrl(outlet, KNOWN_COVERED_FIRM);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return probeHttpFailure(outlet.id, res.status);
    // withOutletSource BEFORE the usability filter — WP search RSS items
    // carry no <source> until the outlet's own domain is stamped in.
    const items = withOutletSource(parseRssItems(await res.text()), outlet);
    return probeFromItems(outlet.id, res.status, items);
  } catch (err) {
    return probeError(outlet.id, err);
  }
}

// Task #219: withCronAlert sends one webhook alert per failing scheduled run
// (any 5xx below on a request carrying the correct x-cron-secret).
Deno.serve(withCronAlert("press-outlets-health", async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  // Cron-only surface — nothing here is triggered from the browser.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Parallel: 6 outlets × up to 15s serial could flirt with the wall-clock
  // budget; the probes are independent.
  const probes = await Promise.all(REGIONAL_TRADE_OUTLETS.map(probeOutlet));

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await serviceClient.from("press_outlet_health").insert(
    probes.map((p) => ({
      outlet_id: p.outletId,
      ok: p.ok,
      item_count: p.itemCount,
      http_status: p.httpStatus,
      error: p.error,
    })),
  );
  if (error) {
    console.error("press-outlets-health insert failed:", error);
    return json({ error: "health insert failed" }, 500);
  }

  const summary = summarizeOutletHealth(probes);
  if (!summary.ok) {
    console.error("press-outlets-health: dead outlet(s):", summary.failed);
    return json({ failed: summary.failed, results: probes }, 500);
  }
  return json({ ok: true, results: probes });
}));
