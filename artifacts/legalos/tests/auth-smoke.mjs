// Authenticated browser smoke check for the LegalOS web app.
//
// Task 55 found every authenticated edge call failing in real browsers:
// the session travelled in a custom `x-user-token` header that no deployed
// edge function's CORS allow-list accepts, so browser preflights were
// rejected before any request ran — and no unit test exercises a preflight.
// This script drives a real Chromium through sign-in → dashboard load
// (audit restoration via visibility-audit-get) and fails if:
//   - any request to /functions/v1/ dies at the network layer (the CORS
//     preflight-rejection signature: no HTTP response at all), or
//   - the browser console logs a CORS error, or
//   - sign-in itself doesn't get past the gate.
//
// Modes:
//   - Real credentials (full check): SMOKE_EMAIL + SMOKE_PASSWORD workspace
//     secrets point at a dedicated, confirmed smoke-test account. Verifies
//     actual sign-in, session persistence, and that the audit-restore call
//     round-trips successfully (HTTP 200).
//   - No credentials (CORS-surface check): a fabricated session is injected
//     into supabase-js storage. The app treats it as signed in and fires
//     every authenticated edge call with `Authorization: Bearer <fake jwt>`.
//     The server rejects the token (401) — which is fine: the point is that
//     the browser preflight passes and every call gets an HTTP response.
//     A reintroduced custom header (e.g. x-user-token) fails here loudly.
//
// Smoke account: registered via the project's own GoTrue signup endpoint
// (POST $VITE_SUPABASE_URL/auth/v1/signup with the publishable key) — this
// project has mailer_autoconfirm on, so any invented email/password is
// confirmed instantly with no inbox. Credentials live ONLY as the
// SMOKE_EMAIL/SMOKE_PASSWORD workspace secrets; never commit them. If the
// account is ever lost, re-run that signup with new values and update the
// two secrets — no other setup is required.
//
// Smoke account data: with real credentials, this smoke also asserts the
// restored audit's score actually renders on the dashboard. That assertion
// SKIPS cleanly while the account has no audit — run
// `pnpm --filter @workspace/legalos run smoke:seed-audit` once (idempotent;
// tests/seed-smoke-audit.mjs) to give the account a real audit via the same
// visibility-audit-run path the intake form uses.
//
// Prerequisites:
//   - Workflow running: `artifacts/legalos: web` (target http://localhost:80/app/).
//   - Chromium from this workspace's Nix system deps (prebuilt Playwright
//     binaries fail on NixOS).
//   - VITE_SUPABASE_URL in the environment (already set in this workspace).
//
// Run: pnpm --filter @workspace/legalos run smoke:auth

import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { GATE_HEADING_TEXT, SignInGateError, signInAndDismissOverlays } from "./lib/smoke-helpers.mjs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:80";
const APP_URL = `${BASE}/app/`;
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
  console.error("FATAL: VITE_SUPABASE_URL is not set in the environment.");
  process.exit(1);
}
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

// firm-profile and executive-report-schedule were deployed — removed from this
// list in the same release. Any future undeployed function should be added
// here to suppress noise until it ships.
const KNOWN_UNDEPLOYED = [];
const isKnownUndeployed = (url) => KNOWN_UNDEPLOYED.some((f) => url.includes(`/functions/v1/${f}`));

const issues = [];
const pass = (m) => console.log("PASS", m);
const fail = (m) => { issues.push(m); console.log("FAIL", m); };

const b64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");

// Structurally valid (but unsigned) JWT: supabase-js only decodes it
// client-side; the deployed functions will reject it with 401 — expected.
function fakeSession() {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  const userId = "00000000-0000-4000-8000-000000000000";
  const jwt = [
    b64url({ alg: "HS256", typ: "JWT" }),
    b64url({ sub: userId, role: "authenticated", aud: "authenticated", exp, session_id: "smoke", email: "smoke@example.com" }),
    "smoke-check-not-a-real-signature",
  ].join(".");
  return {
    access_token: jwt,
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 365,
    expires_at: exp,
    refresh_token: "smoke-fake-refresh-token",
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "smoke@example.com",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    },
  };
}

const execPath = execSync("which chromium").toString().trim();
const browser = await chromium.launch({ executablePath: execPath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// --- Instrumentation: console CORS errors + edge-call network outcomes ----
const corsErrors = [];
const knownUndeployedNoise = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (!/CORS|Access-Control-Allow/i.test(text)) return;
  if (isKnownUndeployed(text)) knownUndeployedNoise.push(text);
  else corsErrors.push(text);
});

const edgeResponses = new Map(); // url -> status
const edgeFailures = [];
let auditGetBody = null; // visibility-audit-get response JSON (real-creds mode)
page.on("response", (resp) => {
  if (resp.url().includes("/functions/v1/")) edgeResponses.set(resp.url(), resp.status());
  if (resp.url().includes("visibility-audit-get")) {
    resp.json().then((j) => { auditGetBody = j; }).catch(() => {});
  }
});
page.on("requestfailed", (req) => {
  if (!req.url().includes("/functions/v1/")) return;
  const line = `${req.method()} ${req.url()} → ${req.failure()?.errorText}`;
  if (isKnownUndeployed(req.url())) knownUndeployedNoise.push(line);
  else edgeFailures.push(line);
});

try {
  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

  const realCreds = !!(EMAIL && PASSWORD);
  if (realCreds) {
    // --- Real sign-in through the gate UI (shared helper) -----------------
    // signInAndDismissOverlays also clears the onboarding wizard /
    // guided-tour offer so overlay noise can't mask later assertions (e.g.
    // the score-label visibility check).
    try {
      await signInAndDismissOverlays(page, { email: EMAIL, password: PASSWORD }, {
        onSubmitted: (via) => pass(via === "gate" ? "submitted sign-in form" : "session restored without the gate"),
      });
      pass("sign-in gate cleared — app is rendering the signed-in view");
    } catch (err) {
      if (!(err instanceof SignInGateError)) throw err;
      fail(err.message);
    }
  } else {
    console.log("NOTE: SMOKE_EMAIL/SMOKE_PASSWORD not set — running CORS-surface mode with a fabricated session (server will 401 the token; that's expected and checked).");
    await page.evaluate(
      ([key, session]) => localStorage.setItem(key, JSON.stringify(session)),
      [`sb-${projectRef}-auth-token`, fakeSession()],
    );
    await page.reload({ waitUntil: "domcontentloaded" });
  }

  // --- The gate must clear (app considers us signed in) -------------------
  // Real-creds mode already asserted this inside signInAndDismissOverlays;
  // the fabricated-session path still needs its own check.
  if (!realCreds) {
    const gateHeading = page.getByText(GATE_HEADING_TEXT);
    try {
      await gateHeading.waitFor({ state: "hidden", timeout: 20000 });
      pass("sign-in gate cleared — app is rendering the signed-in view");
    } catch {
      const authError = await page
        .locator("text=/invalid|error|expired/i")
        .first()
        .textContent()
        .catch(() => null);
      fail(`sign-in gate did not clear${authError ? ` (visible error: ${authError.trim()})` : ""}`);
    }
  }

  // --- Audit restoration call must round-trip ----------------------------
  // Index.tsx fires visibility-audit-get once authenticated; that call is
  // exactly the one Task 55 saw dying on the preflight.
  const auditGetUrl = [...edgeResponses.keys()].find((u) => u.includes("visibility-audit-get"));
  if (!auditGetUrl) {
    try {
      const resp = await page.waitForResponse((r) => r.url().includes("visibility-audit-get"), { timeout: 20000 });
      edgeResponses.set(resp.url(), resp.status());
    } catch {
      // fall through to the check below
    }
  }
  const auditStatus = [...edgeResponses.entries()].find(([u]) => u.includes("visibility-audit-get"))?.[1];
  if (auditStatus === undefined) {
    fail("visibility-audit-get (audit restore) never received an HTTP response — preflight likely rejected");
  } else if (realCreds) {
    if (auditStatus >= 200 && auditStatus < 300) pass(`audit restore call succeeded (HTTP ${auditStatus})`);
    else fail(`audit restore call returned HTTP ${auditStatus} with real credentials`);
  } else {
    // Fabricated token: any HTTP response proves the preflight passed.
    pass(`audit restore call crossed CORS and got an HTTP response (${auditStatus}; 401 expected for the fabricated token)`);
  }

  // Give the remaining signed-in bootstrap calls (user-state-get etc.) a
  // moment to fire, then judge the whole edge-call surface.
  await page.waitForTimeout(4000);

  // --- With real credentials: the restored audit's score must RENDER -------
  // An empty audits list only exercises the empty state — the regression
  // class that breaks only when an audit EXISTS (bad provenance row, market
  // mismatch) needs the account seeded (smoke:seed-audit). Skip cleanly when
  // it isn't, so the CORS-surface/empty-account modes still work.
  if (realCreds && auditStatus >= 200 && auditStatus < 300) {
    const restored = Array.isArray(auditGetBody?.audits) && auditGetBody.audits.length > 0
      ? auditGetBody.audits[0]
      : null;
    if (!restored) {
      console.log("NOTE: smoke account has no audit — score-restore assertion skipped (run smoke:seed-audit once to enable it).");
    } else {
      // The sidebar identity renders measuredScoreLabel(total_score, …) —
      // "85 / 140 measured" or "120 / 200". Assert the seeded audit's own
      // rounded score appears in that label shape, not just anywhere.
      const rounded = Math.round((restored.total_score ?? 0) * 10) / 10;
      const scorePattern = new RegExp(`${String(rounded).replace(".", "\\.")} / \\d+`);
      const scoreVisible = await page.getByText(scorePattern).first()
        .isVisible({ timeout: 15000 }).catch(() => false);
      if (scoreVisible) pass(`restored audit score renders on the dashboard ("${rounded} / …")`);
      else fail(`smoke account has an audit (total_score ${restored.total_score}) but its score label did not render on the dashboard`);
    }
  }

  // --- Live RLS read probe: a recursive policy must fail loudly ------------
  // Task #65's bug class: a policy subquerying its own table makes Postgres
  // reject EVERY authenticated read with 42P17 ("infinite recursion") — a 500
  // through PostgREST — while service-role edge calls keep working, so
  // role-gated UI locks silently and nothing alerts. Read each
  // membership-scoped table as the signed-in user: HTTP 200 (even an empty
  // list) is healthy, anything else fails. Extend the list when a new
  // membership-scoped table ships.
  if (realCreds) {
    const PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!PUBLISHABLE_KEY) {
      console.log("NOTE: VITE_SUPABASE_PUBLISHABLE_KEY not set — RLS live-read probe skipped.");
    } else {
      const stored = await page.evaluate((key) => localStorage.getItem(key), `sb-${projectRef}-auth-token`);
      const jwt = stored ? JSON.parse(stored)?.access_token : null;
      if (!jwt) {
        fail("RLS live-read probe: no session token in storage after sign-in");
      } else {
        const RLS_PROBE_TABLES = [
          "firm_members", "firms", "firm_profiles", // the #65 trio
          "audit_snapshots", "battle_plan_workflow_items", "battle_plan_workflow_comments", "executive_reports", // dormant-era membership-scoped tables
        ];
        const bad = [];
        for (const table of RLS_PROBE_TABLES) {
          try {
            const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
              headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${jwt}` },
              signal: AbortSignal.timeout(15000),
            });
            if (resp.status !== 200) bad.push(`${table}: HTTP ${resp.status} ${(await resp.text()).slice(0, 120)}`);
          } catch (e) {
            bad.push(`${table}: ${e?.message ?? e}`);
          }
        }
        if (bad.length) fail(`RLS live-read probe failed (a 500 here is the recursive-policy signature): ${JSON.stringify(bad)}`);
        else pass(`RLS live-read probe: ${RLS_PROBE_TABLES.length} membership-scoped tables readable as the signed-in user (no recursion lockouts)`);
      }
    }
  }

  if (edgeFailures.length) {
    fail(`edge calls failed at the network layer (CORS preflight signature): ${JSON.stringify(edgeFailures)}`);
  } else if (edgeResponses.size > 0) {
    pass(`all ${edgeResponses.size} edge call(s) received HTTP responses (no preflight rejections)`);
  }

  if (corsErrors.length) {
    fail(`browser console logged CORS errors: ${JSON.stringify(corsErrors.slice(0, 5))}`);
  } else {
    pass("no CORS errors in the browser console");
  }
  if (knownUndeployedNoise.length) {
    console.log(`NOTE: ignored ${knownUndeployedNoise.length} failure(s) from known-undeployed functions (${KNOWN_UNDEPLOYED.join(", ")}) — tracked separately.`);
  }
} catch (err) {
  fail(`unexpected error: ${err?.message ?? err}`);
} finally {
  await browser.close();
}

console.log(issues.length ? `\n${issues.length} issue(s) found.` : "\nAll auth smoke checks passed.");
process.exit(issues.length ? 1 : 0);
