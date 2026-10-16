// Task #199 — repo-side gate for the weekly press-outlet health probe.
//
// The scheduled probe (press-outlets-health edge function, Monday 05:30 UTC)
// writes every run to public.press_outlet_health, and a dead outlet fails
// the cron invocation. But a cron failure only sits in logs until someone
// looks — this check is the "someone": run as a validation step it reads the
// latest row per outlet (service-level Management API SQL, same pattern as
// tests/schema-drift-check.mjs) and fails when any outlet's latest probe
// failed, is missing, or is stale (the weekly run is overdue).
//
// Run:
//   pnpm --filter @workspace/legalos run check:press-health
//
// Env: SUPABASE_ACCESS_TOKEN (secret, in Replit Secrets).

const MGMT_API = "https://api.supabase.com/v1/projects";
const PROJECT_REF = "qeopoiumlnzqwaqzwqcj";
// Weekly Monday run + a day of slack for a delayed/retried invocation.
const STALE_AFTER_DAYS = 8;

async function runSql(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is not set");
  const resp = await fetch(`${MGMT_API}/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!resp.ok) throw new Error(`Management API query failed: HTTP ${resp.status} — ${await resp.text()}`);
  return resp.json();
}

const rows = await runSql(
  `SELECT DISTINCT ON (outlet_id) outlet_id, ok, item_count, error, checked_at
     FROM public.press_outlet_health
    ORDER BY outlet_id, checked_at DESC`,
);

const problems = [];
if (rows.length === 0) {
  problems.push("press_outlet_health is empty — the weekly probe has never run");
}
const staleBefore = Date.now() - STALE_AFTER_DAYS * 864e5;
for (const row of rows) {
  if (!row.ok) {
    problems.push(`${row.outlet_id}: latest probe FAILED (${row.error ?? "no error recorded"}, ${row.checked_at})`);
  }
  if (new Date(row.checked_at).getTime() < staleBefore) {
    problems.push(`${row.outlet_id}: latest probe is stale (${row.checked_at} — weekly run overdue)`);
  }
}

if (problems.length > 0) {
  console.error("press outlet health check FAILED:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`press outlet health: ${rows.length} outlet(s) healthy, latest probes within ${STALE_AFTER_DAYS}d`);
