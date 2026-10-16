// One-time (idempotent) seed: give the SMOKE_EMAIL smoke-test account a real
// visibility audit so tests/auth-smoke.mjs exercises the signed-in DATA
// restoration path (score rendering, history, measured totals) instead of
// only empty states.
//
// What it does:
//   1. Signs in via the project's GoTrue password grant (SMOKE_EMAIL /
//      SMOKE_PASSWORD — the dedicated smoke account; see the account notes in
//      tests/auth-smoke.mjs for how it was registered and how to recreate it).
//   2. Calls visibility-audit-get: if the account already has an audit, exits
//      0 with a NOTE — safe to re-run anytime. Pass --force for a fresh audit.
//   3. Otherwise calls visibility-audit-run — the SAME edge path the app's
//      intake form uses (useMarketVisibility.run) — so the seeded row carries
//      every field a real audit row carries (frozen peer stats, provenance,
//      history). Never a hand-written insert: fixture rows that drift from
//      the live row shape read as broken features downstream.
//
// Permanent fixture state: workflow-services-smoke's dispute leg patches the
// seeded audit's raw_metrics (performance.mobile.performance = 95) on every
// suite run. Its correction-log/history/snapshot ROWS are pruned by the
// smoke's cleanup step, but the corrected value itself stays — trend/delta
// assertions must never rely on that leaf. `--force` regenerates a pristine
// audit anytime (the idempotency check above is the only gate).
//
// The seeded firm is deliberately NOT published — a fictional smoke firm must
// never appear on the public leaderboard. A full run takes minutes (five
// categories with live PageSpeed + directory lookups; categories without a
// configured data source come back "missing", which the dashboard renders as
// a measured denominator — good: that path gets exercised too).
//
// Timeout note: the edge function can outlive the client-side 10-minute
// fetch timeout — the request is still delivered and the audit row lands
// server-side (observed on the first seed: ~12 min). If the script exits
// with a timeout message, just re-run it: the idempotency check in step 2
// confirms the landed audit instead of starting a duplicate run.
//
// Run: pnpm --filter @workspace/legalos run smoke:seed-audit [-- --force]
// Env: SMOKE_EMAIL, SMOKE_PASSWORD (workspace secrets), VITE_SUPABASE_URL,
//      VITE_SUPABASE_PUBLISHABLE_KEY (all already set in this workspace).

const { SMOKE_EMAIL, SMOKE_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = process.env;
const FORCE = process.argv.includes("--force");

if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
  console.error("FATAL: SMOKE_EMAIL/SMOKE_PASSWORD not set — the dedicated smoke account is required.");
  process.exit(1);
}
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error("FATAL: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set.");
  process.exit(1);
}

const EDGE = `${VITE_SUPABASE_URL}/functions/v1`;
const edgeHeaders = (jwt) => ({
  "Content-Type": "application/json",
  apikey: VITE_SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${jwt}`,
});

// 1. Real sign-in (same grant the app uses) → session JWT + user id.
const tokenResp = await fetch(`${VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: VITE_SUPABASE_PUBLISHABLE_KEY },
  body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD }),
});
if (!tokenResp.ok) {
  console.error(`FATAL: smoke account sign-in failed (HTTP ${tokenResp.status}) — check SMOKE_EMAIL/SMOKE_PASSWORD.`);
  process.exit(1);
}
const session = await tokenResp.json();
const jwt = session.access_token;
const userId = session.user?.id;
if (!jwt || !userId) {
  console.error("FATAL: sign-in returned no session.");
  process.exit(1);
}
console.log(`signed in as smoke account (${userId})`);

// 2. Idempotency: an existing audit means the seed already ran.
const getResp = await fetch(`${EDGE}/visibility-audit-get`, {
  method: "POST",
  headers: edgeHeaders(jwt),
  body: JSON.stringify({ clientId: userId, accessToken: jwt }),
});
const existing = getResp.ok ? await getResp.json().catch(() => null) : null;
const count = Array.isArray(existing?.audits) ? existing.audits.length : 0;
if (count > 0 && !FORCE) {
  console.log(`NOTE: smoke account already has ${count} audit(s) (latest total_score ${existing.audits[0]?.total_score}) — nothing to do. Pass --force to re-run.`);
  process.exit(0);
}

// 3. Run one real audit — the same request shape the intake form sends.
console.log("running visibility-audit-run for the smoke account (a full 5-category run takes minutes)…");
const startedAt = Date.now();
let runResp;
try {
  runResp = await fetch(`${EDGE}/visibility-audit-run`, {
    method: "POST",
    headers: edgeHeaders(jwt),
    body: JSON.stringify({
      clientId: userId,
      accessToken: jwt,
      auditedDomain: "example.com",
      displayName: "Smoke Test Firm",
      market: "serbia",
      peerGroup: "local",
      gbpListed: false,
    }),
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
} catch (e) {
  // The function can outlive the client timeout and STILL land the audit
  // server-side — do not blindly retry: re-run this script and let the
  // idempotency check confirm the row before starting a second run.
  console.error(`TIMEOUT/ABORT after ${Math.round((Date.now() - startedAt) / 1000)}s: ${e?.message ?? e}`);
  console.error("The audit may still complete server-side. Re-run this script in a few minutes — the idempotency check will confirm instead of duplicating.");
  process.exit(2);
}
const runBody = await runResp.json().catch(() => null);
if (!runResp.ok || !runBody?.id) {
  console.error(`FATAL: visibility-audit-run failed (HTTP ${runResp.status}): ${JSON.stringify(runBody)}`);
  process.exit(1);
}
console.log(`audit complete in ${Math.round((Date.now() - startedAt) / 1000)}s: id ${runBody.id}, total_score ${runBody.total_score}`);
console.log("smoke:auth will now exercise the data-restoration path on its next run.");
