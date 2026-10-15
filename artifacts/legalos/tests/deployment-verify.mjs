// Deployment verification for firm-profile, executive-report-schedule, and
// the secret-gated census recovery endpoint.
//
// Probes the live hosted Supabase project to confirm:
//   1. All required edge functions are deployed (respond with any HTTP status ≠ 404/network-error).
//   2. Their backing tables exist — verified via the Supabase Management API's
//      database/query endpoint (service-level access, not PostgREST RLS, so a
//      401/403 from PostgREST cannot mask a missing table here).
//
// Uses environment variables:
//   VITE_SUPABASE_URL          — project REST base URL (non-secret, in JS bundle)
//   VITE_SUPABASE_PUBLISHABLE_KEY — anon/publishable key (non-secret, in JS bundle)
//   SUPABASE_ACCESS_TOKEN      — personal access token for Management API (secret)
//
// Run:
//   pnpm --filter @workspace/legalos run verify:deployment
//
// Exit codes: 0 = all checks pass, 1 = one or more failed.
//
// NOTE: functions intentionally reject unauthenticated callers with 401, not 404.
// Any non-404 HTTP response means the function is present and running.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("FATAL: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set.");
  process.exit(1);
}

// Extract project ref from the URL (e.g. kosmxczrwrhzmmloxobq)
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
const MGMT_BASE = `https://api.supabase.com/v1/projects/${projectRef}`;

const issues = [];
const pass = (m) => console.log("PASS", m);
const fail = (m) => { issues.push(m); console.error("FAIL", m); };

// ── 1. Edge-function probes ──────────────────────────────────────────────────

const FUNCTIONS_TO_VERIFY = [
  { slug: "firm-profile",              description: "Firm Profile" },
  { slug: "executive-report-schedule", description: "Executive Report Schedule" },
  // This endpoint is intentionally probed without its recovery secret. A 401
  // proves the deployed function reached its auth gate; a 404 means the
  // recovery path is absent and cannot help during a provider outage.
  { slug: "census-audit-remeasure-missing", description: "Census Missing-Category Recovery" },
];

for (const { slug, description } of FUNCTIONS_TO_VERIFY) {
  const url = `${SUPABASE_URL}/functions/v1/${slug}`;
  let status;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({}),
    });
    status = resp.status;
  } catch (err) {
    fail(`${description} (${slug}): network error — ${err.message}`);
    continue;
  }

  if (status === 404) {
    fail(`${description} (${slug}): HTTP 404 — function is NOT deployed`);
  } else {
    pass(`${description} (${slug}): HTTP ${status} — function is deployed and responding`);
  }
}

// ── 2. Backing-table existence via Management API SQL ────────────────────────
// Uses the Management API database/query endpoint which runs with service-role
// privileges, not PostgREST. A PostgREST HEAD request returns 401/403 for
// RLS-protected tables even when they exist — the management endpoint actually
// executes the query and returns zero rows (not 401) when the table is present.

const TABLES_TO_VERIFY = [
  "firm_profiles",
  "executive_report_schedules",
  "executive_reports",
];

if (!ACCESS_TOKEN) {
  console.warn("NOTE: SUPABASE_ACCESS_TOKEN not set — skipping table-existence checks via Management API.");
} else {
  const query = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (${TABLES_TO_VERIFY.map((t) => `'${t}'`).join(", ")}) ORDER BY table_name;`;
  let rows;
  try {
    const resp = await fetch(`${MGMT_BASE}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!resp.ok) {
      fail(`Management API query failed: HTTP ${resp.status}`);
      rows = null;
    } else {
      rows = await resp.json();
    }
  } catch (err) {
    fail(`Management API query error: ${err.message}`);
    rows = null;
  }

  if (rows !== null) {
    const found = new Set(rows.map((r) => r.table_name));
    for (const table of TABLES_TO_VERIFY) {
      if (found.has(table)) {
        pass(`Table ${table}: exists in public schema`);
      } else {
        fail(`Table ${table}: NOT found — migration may not have been applied`);
      }
    }
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(
  issues.length
    ? `\n${issues.length} check(s) failed.`
    : "\nAll deployment checks passed.",
);
process.exit(issues.length ? 1 : 0);
