// Firm Profile end-to-end smoke: proves a real signed-in user can open
// Settings → Firm Profile, save a change, and see it persist after a reload.
//
// Why this exists: the firm-profile edge function and unit-tested hook each
// passed in isolation, but nothing verified the whole loop against the live
// deployment — a runtime schema mismatch between the deployed function and
// the firm_profiles table (e.g. a missing column in the upsert) only shows
// up when a real save round-trips.
//
// What it checks:
//   - sign-in gate clears with the real smoke account,
//   - the firm-profile GET returns HTTP 200 and the form renders,
//   - saving a unique Website value returns HTTP 200 (the upsert path — this
//     is where a schema mismatch would 500),
//   - after a full reload the saved value is still in the form (read path),
//   - no firm-profile call dies at the network layer (CORS preflight).
//
// Prerequisites:
//   - Workflow running: `artifacts/legalos: web` (target http://localhost:80/app/).
//   - Chromium from this workspace's Nix system deps.
//   - SMOKE_EMAIL/SMOKE_PASSWORD workspace secrets (the account needs owner/
//     admin/marketing/consultant/member role in a firm — read-only roles see
//     no form by design). See auth-smoke.mjs's header for account setup.
//
// Run: pnpm --filter @workspace/legalos run smoke:profile

import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { signInAndDismissOverlays } from "./lib/smoke-helpers.mjs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:80";
const APP_URL = `${BASE}/app/`;
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("FATAL: SMOKE_EMAIL/SMOKE_PASSWORD must be set — this smoke only runs with a real account.");
  process.exit(1);
}

// Unique per run: a persistence assertion against a fixed value could pass
// off a stale earlier save without this run's save ever landing.
const SMOKE_VALUE = `https://smoke-${Date.now()}.example.com`;

const issues = [];
const pass = (m) => console.log("PASS", m);
const fail = (m) => { issues.push(m); console.log("FAIL", m); };

const execPath = execSync("which chromium").toString().trim();
const browser = await chromium.launch({ executablePath: execPath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const profileCalls = []; // { action, status }
page.on("response", (resp) => {
  if (resp.url().includes("/functions/v1/firm-profile")) profileCalls.push(resp.status());
});
const profileNetFailures = [];
page.on("requestfailed", (req) => {
  if (req.url().includes("/functions/v1/firm-profile")) {
    profileNetFailures.push(`${req.method()} → ${req.failure()?.errorText}`);
  }
});

async function signInAndOpenSettings() {
  // Shared helper: gate sign-in (only when the gate shows) → wait for the
  // gate to clear → dismiss the onboarding wizard / guided-tour offer / any
  // future overlay added in tests/lib/smoke-helpers.mjs.
  await signInAndDismissOverlays(page, { email: EMAIL, password: PASSWORD });
  // Sidebar Settings nav (AppShell). Title attr when collapsed, text when not.
  // After a reload the URL already carries ?section=settings and the app
  // restores the section from it by design — skip the nav click (this leg
  // doubles as a section-restoration check) and just wait for the content.
  if (!page.url().includes("section=settings")) {
    await page.locator('button[title="Settings"], button:has-text("Settings")').first().click();
  }
  // Level-scoped: the settings card's h2. The PersonalizeOnboarding wizard
  // has its own "Firm Profile" heading (h3) that can linger mounted after
  // dismissal, and the page h1 is "Firm Profile & Data".
  await page.getByRole("heading", { level: 2, name: "Firm Profile", exact: true }).waitFor({ timeout: 60000 });
}

try {
  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await signInAndOpenSettings();
  pass("signed in and opened Settings → Firm Profile");

  // The form must actually render — an unavailable function or a broken GET
  // leaves only a "not available" notice instead of inputs.
  const websiteInput = page.getByPlaceholder("https://yourfirm.com");
  try {
    await websiteInput.waitFor({ timeout: 15000 });
    pass("Firm Profile form rendered (edge function available, GET succeeded)");
  } catch {
    const notice = await page.locator("text=/aren't available on this deployment/i").first().textContent().catch(() => null);
    fail(`Firm Profile form never rendered${notice ? " — 'not available' notice shown" : ""}`);
  }

  // Save a unique Website value and require the upsert to return 2xx. The
  // two settings save buttons have distinct labels now ("Save firm context"
  // for the localStorage form, "Save workspace profile" for this
  // server-backed card), so a plain accessible-name locator is unambiguous.
  await websiteInput.fill(SMOKE_VALUE);
  const [saveResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/functions/v1/firm-profile") && r.request().method() === "POST", { timeout: 20000 }),
    page.getByRole("button", { name: /save workspace profile/i }).click(),
  ]);
  if (saveResp.status() >= 200 && saveResp.status() < 300) {
    pass(`firm-profile save returned HTTP ${saveResp.status()}`);
  } else {
    const body = await saveResp.text().catch(() => "");
    fail(`firm-profile save returned HTTP ${saveResp.status()} — possible schema/role mismatch (${body.slice(0, 200)})`);
  }

  // Full reload → the saved value must come back from the server.
  await page.reload({ waitUntil: "domcontentloaded" });
  await signInAndOpenSettings();
  const persisted = await page.getByPlaceholder("https://yourfirm.com").inputValue({ timeout: 15000 });
  if (persisted === SMOKE_VALUE) {
    pass("saved Website value persisted across a full reload");
  } else {
    fail(`Website value after reload is ${JSON.stringify(persisted)}, expected ${JSON.stringify(SMOKE_VALUE)}`);
  }

  if (profileNetFailures.length) {
    fail(`firm-profile calls failed at the network layer: ${JSON.stringify(profileNetFailures)}`);
  } else if (profileCalls.length) {
    pass(`all ${profileCalls.length} firm-profile call(s) received HTTP responses`);
  }
} catch (err) {
  fail(`unexpected error: ${err?.message ?? err}`);
  try {
    console.log("── page state at failure ──");
    console.log("url:", page.url());
    console.log((await page.locator("body").innerText({ timeout: 5000 })).slice(0, 800));
  } catch { /* best effort */ }
} finally {
  await browser.close();
}

console.log(issues.length ? `\n${issues.length} issue(s) found.` : "\nAll firm-profile smoke checks passed.");
process.exit(issues.length ? 1 : 0);
