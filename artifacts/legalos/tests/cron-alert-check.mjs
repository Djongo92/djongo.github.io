#!/usr/bin/env node
// Monitoring check: surfaces every alert logged in public.cron_alerts in the
// last 25 hours (one daily cycle plus an hour of slack) and exits non-zero
// when there are any, so the scheduled Monitor workflow
// (.github/workflows/monitor.yml) turns red and GitHub emails the owner.
// The table holds two kinds of alert:
//   - scheduled-job failures (withCronAlert / sendCronAlert → cron-alert-inbox)
//   - browser errors from the web app (job "web-client", via client-error-report)
//
// Run: pnpm --filter @workspace/uvid run check:cron-alerts
// Env: SUPABASE_ACCESS_TOKEN (GitHub Actions secret).

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

  // Scheduled calls the gateway rejected or that never answered don't reach
  // withCronAlert, so read pg_net's own record of each cron HTTP call too.
  // pg_net keeps responses for ~6h, which is why monitor.yml runs at 07:47
  // UTC: after every nightly/Monday job (03:00–07:00).
  let netRows = [];
  try {
    const r = await runSql(
      `SELECT id, status_code, timed_out, error_msg, created FROM net._http_response ` +
      `WHERE created >= '${since}' AND (status_code IS NULL OR status_code >= 400) ORDER BY created DESC`
    );
    if (Array.isArray(r)) netRows = r;
  } catch (e) {
    console.error(`cron-alert-check: could not read net._http_response: ${e.message}`);
  }
  for (const n of netRows) {
    rows.push({
      job: "cron-http-call",
      message: n.timed_out ? "timed out" : n.status_code == null ? "no response" : `HTTP ${n.status_code}`,
      detail: n.error_msg ?? null,
      received_at: n.created,
    });
  }

  if (rows.length === 0) {
    console.log(`cron-alert-check: ✓ no cron failure alerts in the last ${WINDOW_HOURS}h`);
    process.exit(0);
  }

  const isClient = (row) => row.job === "web-client";
  const groups = [
    ["Scheduled job failures", rows.filter((r) => !isClient(r) && r.job !== "cron-http-call")],
    ["Cron HTTP calls without a good answer", rows.filter((r) => r.job === "cron-http-call")],
    ["Browser errors (web app)", rows.filter(isClient)],
  ];
  console.error(`\ncron-alert-check: ${rows.length} alert(s) in the last ${WINDOW_HOURS}h\n`);
  for (const [title, list] of groups) {
    if (list.length === 0) continue;
    console.error(`${title} (${list.length}):`);
    for (const row of list) {
      const ts = new Date(row.received_at).toISOString();
      console.error(`  [${ts}] ${row.job}: ${row.message}`);
      if (row.detail) console.error(`    detail: ${row.detail}`);
    }
    console.error("");
  }
  console.error(`Investigate and fix the root cause. Browser errors carry the route and build (release) they came from.`);
  process.exit(1);
}

main().catch((e) => {
  console.error("cron-alert-check: unexpected error:", e);
  process.exit(1);
});
