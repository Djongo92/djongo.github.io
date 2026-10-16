#!/usr/bin/env node
// Task #219 — monitoring check: surfaces any cron failure alerts logged in the
// last 25 hours (one cron cycle plus an hour of slack). Exits non-zero when
// unresolved alerts exist so the Replit validation workflow turns red and
// someone looks at them. Exits 0 when the table is empty or all recent alerts
// are outside the window.
//
// Run: pnpm --filter @workspace/uvid run check:cron-alerts
// Env: SUPABASE_ACCESS_TOKEN (in Replit Secrets), VITE_SUPABASE_URL (public).

const MGMT_API = "https://api.supabase.com/v1/projects";
const PROJECT_REF = "qeopoiumlnzqwaqzwqcj";
const WINDOW_HOURS = 25;

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

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("FATAL: SUPABASE_ACCESS_TOKEN must be set.");
    process.exit(1);
  }

  const since = new Date(Date.now() - WINDOW_HOURS * 3_600_000).toISOString();
  let rows;
  try {
    rows = await runSql(
      `SELECT id, job, message, detail, received_at FROM public.cron_alerts ` +
      `WHERE received_at >= '${since}' ORDER BY received_at DESC`
    );
  } catch (e) {
    console.error(`cron-alert-check: DB query failed: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(rows)) {
    console.error("cron-alert-check: unexpected response shape from cron_alerts query");
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log(`cron-alert-check: ✓ no cron failure alerts in the last ${WINDOW_HOURS}h`);
    process.exit(0);
  }

  console.error(`\ncron-alert-check: ${rows.length} cron failure alert(s) in the last ${WINDOW_HOURS}h:\n`);
  for (const row of rows) {
    const ts = new Date(row.received_at).toISOString();
    console.error(`  [${ts}] ${row.job}: ${row.message}`);
    if (row.detail) console.error(`    detail: ${row.detail}`);
  }
  console.error(`\nInvestigate the failing job(s) and resolve the root cause.`);
  process.exit(1);
}

main().catch((e) => {
  console.error("cron-alert-check: unexpected error:", e);
  process.exit(1);
});
