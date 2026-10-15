// Firm-pinning contract smoke test against the LIVE deployed edge functions
// (user-state-get / user-state-set). The pinning contract — user-state-get
// returns resolvedClientId, clients echo it as requestedFirmId, and
// user-state-set honors it only for the caller's live member firms — was
// previously covered only by mocked unit tests of resolveForUser. This script
// proves three behaviors against the real functions and the real database:
//
//   1. A valid multi-member firm pin targets EXACTLY that firm — a set with
//      the pin lands on the pinned firm's rows and nowhere else. (A solo-firm
//      pin variant proves the pin is load-bearing: auto-detection alone would
//      have picked the multi-member firm instead.)
//   2. An expired membership (access_expires_at in the past) is ignored —
//      pinning it falls back to auto-detection instead of targeting the dead
//      firm, and writes follow the fallback.
//   3. A foreign requestedFirmId (no membership at all) never widens access —
//      resolution falls back and no row is ever written under the foreign
//      firm's id.
//
// Row placement is verified with service-level SQL via the Management API
// (same endpoint deployment-verify uses), not just API responses — the whole
// point is WHERE the row landed.
//
// Fixtures are four throwaway signup accounts: consultant A, teammate B
// (A is added to B's firm → live multi-member), foreign user C (no link),
// and firm owner D (A's membership row there is inserted already expired).
// Fixture lifecycle is cleanup-safe: created ids are tracked incrementally
// from the first successful signup and cleanup runs in a finally even when
// setup or an assertion throws. Cleanup deletes state rows, the auth users
// (cascading firm_members) AND the four auto-provisioned firms rows — each
// step independently, so one failure doesn't skip the rest. The fixture
// password is random per run, so an interrupted cleanup never leaves an
// account with a known credential behind.
//
// Run:
//   pnpm --filter @workspace/legalos run smoke:firm-pinning
//
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (non-secret, already
// in the workspace) and SUPABASE_ACCESS_TOKEN (secret, for fixture SQL).

import { randomUUID } from "node:crypto";

const MGMT_API = "https://api.supabase.com/v1/projects";

/** Run one service-level SQL statement through the Management API. */
async function runSql(projectRef, accessToken, query) {
  const resp = await fetch(`${MGMT_API}/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!resp.ok) throw new Error(`Management API query failed: HTTP ${resp.status} — ${await resp.text()}`);
  return resp.json();
}

/** Sign up a throwaway account; returns { token, id }. */
async function signUp(supabaseUrl, anonKey, email, password) {
  const resp = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email, password }),
  });
  const body = await resp.json();
  if (!resp.ok || !body.access_token) throw new Error(`signup failed for ${email}: HTTP ${resp.status}`);
  return { token: body.access_token, id: body.user.id };
}

/** Call user-state-get / user-state-set as a signed-in user; returns {status, body}. */
async function callStateFn(supabaseUrl, anonKey, fn, user, payload) {
  const resp = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${user.token}`,
    },
    body: JSON.stringify({ clientId: user.id, accessToken: user.token, ...payload }),
  });
  return { status: resp.status, body: await resp.json() };
}

/** Which client_id owns the state row for a key? Null when absent. */
async function stateRowOwner(projectRef, accessToken, key) {
  const rows = await runSql(
    projectRef, accessToken,
    `SELECT client_id FROM public.user_app_state WHERE key = '${key}';`,
  );
  return rows.length === 0 ? null : rows[0].client_id;
}

const idList = (ids) => ids.map((id) => `'${id}'`).join(", ");

/**
 * Run the full smoke. Returns { results: [{ ok, message }] } — never throws
 * for assertion failures, only for fixture-setup errors. Cleanup of every
 * fixture created so far always runs (finally), each step independently.
 */
export async function runFirmPinningSmoke({ supabaseUrl, anonKey, accessToken, log = () => {} }) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const ts = Date.now();
  // Random per-run credential: if a run is ever interrupted past signup, the
  // leftover account's password is not something anyone knows.
  const password = `Fp!${randomUUID()}`;
  const results = [];
  const check = (ok, message) => {
    results.push({ ok, message });
    log(`${ok ? "OK  " : "FAIL"} ${message}`);
  };

  // Tracked incrementally so cleanup is complete even after a partial setup.
  const createdUsers = [];
  const createdFirms = [];

  const cleanup = async () => {
    const attempt = async (label, fn) => {
      try {
        await fn();
      } catch (err) {
        log(`WARN cleanup (${label}) failed — leftover fixtures possible: ${err.message}`);
      }
    };
    await attempt("state rows", () => runSql(projectRef, accessToken,
      `DELETE FROM public.user_app_state WHERE key LIKE 'fp-smoke-%-${ts}';`));
    if (createdUsers.length > 0) {
      // Cascades firm_members rows (user_id FK ON DELETE CASCADE).
      await attempt("auth users", () => runSql(projectRef, accessToken,
        `DELETE FROM auth.users WHERE id IN (${idList(createdUsers)});`));
    }
    if (createdFirms.length > 0) {
      // Signup-trigger firms are NOT cascaded by the user deletion — delete
      // them explicitly or every run orphans four firms in production.
      await attempt("firms", () => runSql(projectRef, accessToken,
        `DELETE FROM public.firms WHERE id IN (${idList(createdFirms)});`));
    }
  };

  try {
    // ── Fixtures ────────────────────────────────────────────────────────────
    // Sequential signups so createdUsers stays accurate if one fails midway.
    const users = {};
    for (const role of ["a", "b", "c", "d"]) {
      const user = await signUp(supabaseUrl, anonKey, `firm-pin-smoke-${role}-${ts}@example.com`, password);
      createdUsers.push(user.id);
      users[role] = user;
    }
    const { a: A, b: B, c: C, d: D } = users;
    const fixtureKeys = [`fp-smoke-1a-${ts}`, `fp-smoke-2-${ts}`, `fp-smoke-3-${ts}`];

    // Every signup auto-provisions a solo firm (handle_new_user_firm trigger).
    // Poll briefly — the trigger runs inside the signup transaction, so this
    // is normally immediate, but don't race it.
    let firms = {};
    for (let attemptNo = 0; attemptNo < 10; attemptNo++) {
      const rows = await runSql(projectRef, accessToken,
        `SELECT user_id, firm_id FROM public.firm_members WHERE user_id IN (${idList(createdUsers)});`);
      firms = Object.fromEntries(rows.map((r) => [r.user_id, r.firm_id]));
      for (const r of rows) if (!createdFirms.includes(r.firm_id)) createdFirms.push(r.firm_id);
      if (createdUsers.every((id) => firms[id])) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    for (const id of createdUsers) {
      if (!firms[id]) throw new Error(`fixture setup: no auto-provisioned firm for user ${id}`);
    }
    const [firmA, firmB, firmC, firmD] = [firms[A.id], firms[B.id], firms[C.id], firms[D.id]];

    // A joins B's firm (live → multi-member) and D's firm (already expired).
    await runSql(projectRef, accessToken,
      `INSERT INTO public.firm_members (firm_id, user_id, role) VALUES ('${firmB}', '${A.id}', 'member');`);
    await runSql(projectRef, accessToken,
      `INSERT INTO public.firm_members (firm_id, user_id, role, access_expires_at) VALUES ('${firmD}', '${A.id}', 'member', '2000-01-01T00:00:00Z');`);

    // ── Case 1a: valid multi-member pin targets exactly that firm ───────────
    const pinB = await callStateFn(supabaseUrl, anonKey, "user-state-get", A, { requestedFirmId: firmB });
    check(
      pinB.status === 200 && pinB.body.resolvedClientId === firmB,
      `1a pin live multi-member firm → resolves to it (got ${pinB.status}, resolved ${pinB.body.resolvedClientId})`,
    );
    await callStateFn(supabaseUrl, anonKey, "user-state-set", A,
      { requestedFirmId: firmB, key: fixtureKeys[0], value: { case: "1a" } });
    const owner1a = await stateRowOwner(projectRef, accessToken, fixtureKeys[0]);
    check(owner1a === firmB,
      `1a write with firm pin lands on the pinned firm's rows (owner ${owner1a}, expected ${firmB})`);

    // ── Case 1b: pin is load-bearing — a solo-firm pin beats auto-detection ─
    // Without the pin, auto-detection would pick firmB (>1 member). Resolving
    // to A's own solo firm is only possible because the pin was honored.
    const pinSolo = await callStateFn(supabaseUrl, anonKey, "user-state-get", A, { requestedFirmId: firmA });
    check(
      pinSolo.status === 200 && pinSolo.body.resolvedClientId === firmA,
      `1b pin own solo firm → pin overrides auto-detection (resolved ${pinSolo.body.resolvedClientId}, auto-detect would pick ${firmB})`,
    );

    // ── Case 2: expired membership pin falls back, writes follow ────────────
    const pinExpired = await callStateFn(supabaseUrl, anonKey, "user-state-get", A, { requestedFirmId: firmD });
    check(
      pinExpired.status === 200 && pinExpired.body.resolvedClientId !== firmD && pinExpired.body.resolvedClientId === firmB,
      `2 expired-membership pin → ignored, auto-detection takes over (resolved ${pinExpired.body.resolvedClientId}, dead firm ${firmD})`,
    );
    await callStateFn(supabaseUrl, anonKey, "user-state-set", A,
      { requestedFirmId: firmD, key: fixtureKeys[1], value: { case: "2" } });
    const owner2 = await stateRowOwner(projectRef, accessToken, fixtureKeys[1]);
    check(owner2 === firmB,
      `2 write under expired pin lands on the auto-detected firm, not the dead one (owner ${owner2})`);

    // ── Case 3: foreign pin never widens access ─────────────────────────────
    const pinForeign = await callStateFn(supabaseUrl, anonKey, "user-state-get", A, { requestedFirmId: firmC });
    check(
      pinForeign.status === 200 && pinForeign.body.resolvedClientId !== firmC,
      `3 foreign firm pin → not honored (resolved ${pinForeign.body.resolvedClientId}, foreign firm ${firmC})`,
    );
    await callStateFn(supabaseUrl, anonKey, "user-state-set", A,
      { requestedFirmId: firmC, key: fixtureKeys[2], value: { case: "3" } });
    const owner3 = await stateRowOwner(projectRef, accessToken, fixtureKeys[2]);
    check(owner3 !== firmC && owner3 === firmB,
      `3 write under foreign pin never lands on the foreign firm's rows (owner ${owner3})`);

    return { results };
  } finally {
    await cleanup();
  }
}

// ── Main (only when executed directly) ───────────────────────────────────────

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_ACCESS_TOKEN } = process.env;
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY || !SUPABASE_ACCESS_TOKEN) {
    console.error("FATAL: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and SUPABASE_ACCESS_TOKEN must be set.");
    process.exit(1);
  }

  try {
    const run = await runFirmPinningSmoke({
      supabaseUrl: VITE_SUPABASE_URL,
      anonKey: VITE_SUPABASE_PUBLISHABLE_KEY,
      accessToken: SUPABASE_ACCESS_TOKEN,
      log: (line) => console.log(line),
    });
    const failures = run.results.filter((r) => !r.ok);
    console.log(failures.length
      ? `\n${failures.length} check(s) FAILED`
      : `\nAll ${run.results.length} firm-pinning checks passed against the live functions.`);
    process.exitCode = failures.length ? 1 : 0;
  } catch (err) {
    console.error(`FATAL: ${err.message}`);
    process.exitCode = 1;
  }
}
