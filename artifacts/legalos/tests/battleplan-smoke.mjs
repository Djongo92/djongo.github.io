// Battle Plan CTA browser smoke: every "Run it now" / "Open the tool" /
// "Rerun it" button on the Battle Plan page, clicked in a real Chromium,
// asserting the actual tool modal/tool view opens — not just the section.
//
// Task 63 verified this wiring once with a throwaway script; this is the
// standing guard. The bug class it catches: a renamed step key
// (IntelGrid ORDER ↔ runBattlePlanTool in Index.tsx) or a tool dropping its
// useAutoOpenTool hook (src/lib/progressToolLaunch.ts) — either breaks the
// launch silently: the user lands on the Progress/Workshop section and
// nothing opens. No unit test covers that cross-component handoff.
//
// Scenarios (mirroring the task-63 pass):
//   A. Demo, cold load per CTA — the pending-launch path: CTA fires before
//      the lazy Progress/Workshop section has ever mounted.
//   B. Demo, Progress pre-visited — the warm path: chunks cached and the
//      section mounted earlier in the session, so the handoff is fast.
//   C. Fabricated-session empty state — no intel done, so all 6 CTAs read
//      "Run it now" and the empty campaign-map CTA ("Generate 30/60/90
//      Roadmap") is present. (Same fabricated-session trick as
//      auth-smoke.mjs: the app boots signed-in, the server 401s the fake
//      token, and the empty state renders.)
//   D. Real signed-in account (SMOKE_EMAIL/SMOKE_PASSWORD, the auth-smoke
//      pattern) — the server-restored battle plan drives the CTA wiring, so
//      "Open the tool"/"Rerun it" states run against persisted intel instead
//      of demo fixtures. Every server-persisted slot must render its card in
//      the done state ("Open the tool"/"Rerun it") before the clicks run.
//      SKIPS with a NOTE when credentials are missing or the account has no
//      persisted battle-plan slots yet (user-state-get returns none).
//
// Overlays are pre-seeded so nothing intercepts the clicks:
//   legalos_tour_progress (status done, schema v4), legalos_battleplan_badges_seen
//   (ALL four badge ids — the demo plan earns several and an unseen badge pops
//   a celebration modal that swallows every click), sessionStorage
//   guidebook_personalize_seen, and for demo runs legalos_demo_mode +
//   sessionStorage legalos_showcase_grant (a JSON object — readShowcaseGrant
//   JSON.parses it). A dismissOverlays sweep before each click is the second
//   line of defence if a fifth badge or a new overlay ever appears.
//
// Prerequisites:
//   - Workflow running: `artifacts/legalos: web` (serves /app/). If the dev
//     server is unreachable the script SKIPS cleanly (exit 0).
//   - Chromium from this workspace's Nix system deps (prebuilt Playwright
//     binaries fail on NixOS).
//   - VITE_SUPABASE_URL in the environment (scenario C's session key).
//
// Run: pnpm --filter @workspace/legalos run smoke:battleplan
// Env: SMOKE_BASE_URL (default http://localhost:80).

import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { SignInGateError, signInAndDismissOverlays } from "./lib/smoke-helpers.mjs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:80";
const APP = `${BASE}/app/`;
const sectionUrl = (s) => `${APP}?section=${s}`;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const projectRef = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split(".")[0] : null;

// IntelGrid ORDER — a 7th card (roadmap) deliberately lives in the campaign
// map instead, exercised via the campaign CTA below.
// `card` is the battle-plan card label; `heading` is what must appear once
// the tool itself has opened (task-63 assertion targets).
// `serverKey` is the slot's key in the user-state-get response (SERVER_KEYS
// in src/hooks/useBattlePlanCache.ts) — scenario D uses it to know which
// cards the smoke account has PERSISTED intel for.
const INTEL_CTAS = [
  { card: "Roast My Homepage", heading: "Roast My Homepage", section: "progress", serverKey: "battleplan_roast" },
  { card: "Competitor Analysis", heading: "Competitor Analysis", section: "progress", serverKey: "battleplan_competitor" },
  { card: "Market Visibility Score", heading: "Market Visibility Score", section: "progress", serverKey: "battleplan_visibility" },
  { card: "Headline Lab champion", heading: "Headline Lab", section: "workshop", serverKey: "battleplan_headline" },
  { card: "Bio Rewriter result", heading: "Bio Rewriter", section: "workshop", serverKey: "battleplan_bio" },
  // Maturity last: it opens a modal on the battle plan page itself (no
  // section navigation), so warm-scenario cleanup differs from the rest.
  { card: "Firm Maturity Score", heading: "Firm Maturity Score", section: null, serverKey: "battleplan_maturity" },
];
const CAMPAIGN_CTA = { name: /generate 30\/60\/90 roadmap/i, heading: "Your 30/60/90 Day Roadmap", section: "progress" };

const issues = [];
const pass = (m) => console.log("PASS", m);
const fail = (m) => { issues.push(m); console.log("FAIL", m); };

// ── Pre-flight: skip cleanly when the dev server isn't up ───────────────────
try {
  const resp = await fetch(APP, { signal: AbortSignal.timeout(8000) });
  if (resp.status >= 500) throw new Error(`HTTP ${resp.status}`);
} catch (err) {
  console.log(`SKIP: dev server not reachable at ${APP} (${err.message}). A down dev server is not a product bug.`);
  process.exit(0);
}

// Overlay suppression — seeded before any app JS runs.
const SEED_OVERLAYS = `
  localStorage.setItem("legalos_tour_progress", JSON.stringify({ v: 4, demo: { status: "done", step: 0 }, account: { status: "done", step: 0 } }));
  localStorage.setItem("legalos_battleplan_badges_seen", JSON.stringify(["foundation-builder", "voice-found", "battle-ready", "fully-armed"]));
  sessionStorage.setItem("guidebook_personalize_seen", "1");
`;
const SEED_DEMO = SEED_OVERLAYS + `
  localStorage.setItem("legalos_demo_mode", "1");
  sessionStorage.setItem("legalos_showcase_grant", JSON.stringify({ label: "smoke" }));
`;

// Structurally valid (but unsigned) session, as in auth-smoke.mjs: the app
// treats it as signed in; deployed functions 401 it, which is fine — the
// empty state is what scenario C wants.
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
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
      id: userId, aud: "authenticated", role: "authenticated", email: "smoke@example.com",
      app_metadata: { provider: "email" }, user_metadata: {}, created_at: new Date(0).toISOString(),
    },
  };
}

const execPath = execSync("which chromium").toString().trim();
const browser = await chromium.launch({ executablePath: execPath, args: ["--no-sandbox"] });

const consoleErrors = [];
const pageErrors = [];
let devBanner502s = 0; // 502s from the Replit dev-banner script (env noise)
const wirePage = (page) => {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Scenario C's fabricated session is 401'd by the deployed functions BY
    // DESIGN (same contract as auth-smoke.mjs) — resource-load 401 noise is
    // expected there. Any other console error (JS exceptions, 500s, CORS)
    // still fails the run.
    if (/Failed to load resource:.*\b401\b/.test(text)) return;
    // The Replit dev-banner script (served outside the app by the dev proxy)
    // intermittently 502s; it's environment plumbing, not product code. The
    // console message carries no URL, so tag it via the request listener below.
    if (/Failed to load resource:.*\b502\b/.test(text) && devBanner502s > 0) { devBanner502s--; return; }
    consoleErrors.push(text);
  });
  page.on("response", (resp) => {
    if (resp.status() === 502 && resp.url().includes("vite-plugin-dev-banner")) devBanner502s++;
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
};

const newSeededPage = async (seedScript) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(seedScript);
  const page = await context.newPage();
  wirePage(page);
  return { context, page };
};

// Locators ──────────────────────────────────────────────────────────────────
const intelHeading = (page) => page.getByRole("heading", { name: "The intel" });
const intelCtaButton = (page, cardLabel) =>
  page
    .locator("section", { has: page.getByText("The intel") })
    .locator("div.rounded-sm.p-5")
    .filter({ hasText: cardLabel })
    .getByRole("button")
    .first();

// On a setup failure, capture enough page state to tell an auth/bootstrap
// failure (gate stuck, spinner, wrong URL) apart from a CTA-launch
// regression (page rendered fine, tool never opened).
const pageDiagnostic = async (page) => {
  const headings = await page.locator("h1, h2, h3").allTextContents().catch(() => []);
  const body = ((await page.locator("body").textContent().catch(() => "")) ?? "")
    .replace(/\s+/g, " ").trim().slice(0, 240);
  return `url=${page.url()} headings=${JSON.stringify(headings.map((h) => h.trim()).filter(Boolean).slice(0, 8))} body≈"${body}"`;
};

// Wait for the battle plan page's intel grid. The fabricated-session
// bootstrap (scenario C) settles on the server's clock — 401'd restore
// calls plus any client retry backoff — so a slow cold boot gets one reload
// before we call it a failure, and every failure carries the diagnostic.
const waitForBattlePlan = async (page, { timeout = 30000, retries = 1 } = {}) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await intelHeading(page).waitFor({ state: "visible", timeout });
      return;
    } catch (err) {
      if (attempt === retries) {
        throw new Error(`battle plan intel grid never rendered — ${await pageDiagnostic(page)}`);
      }
      await page.reload({ waitUntil: "domcontentloaded", timeout }).catch(() => {});
    }
  }
};

// Close any ModalShell-style overlay (badge celebration, tour, personalize
// wizard) that would otherwise swallow the CTA click. The only overlays
// this smoke can meet are celebration/info modals whose first button is a
// dismiss control ("Keep going →" or the close X), so clicking it is safe.
const dismissOverlays = async (page) => {
  const overlay = page.locator("div.fixed.inset-0.z-50").first();
  for (let i = 0; i < 3; i++) {
    if ((await overlay.count()) === 0 || !(await overlay.isVisible().catch(() => false))) return;
    const btn = overlay.getByRole("button").first();
    if ((await btn.count()) === 0) return;
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
};

// Click a CTA and assert the tool itself opened (its heading becomes
// visible), not merely that the section navigated.
const exerciseCta = async (page, cta, click, scenario) => {
  const label = `[${scenario}] ${cta.card ?? cta.name}`;
  try {
    await dismissOverlays(page);
    await click();
    if (cta.section) {
      await page.waitForURL(new RegExp(`section=${cta.section}`), { timeout: 10000 });
    }
    await page
      .getByRole("heading", { name: cta.heading })
      .first()
      .waitFor({ state: "visible", timeout: 20000 });
    pass(`${label} → tool opened ("${cta.heading}")`);
  } catch (err) {
    fail(`${label} → tool did NOT open: ${err?.message?.split("\n")[0] ?? err}`);
  }
};

try {
  // ── Scenario A: demo, cold load per CTA (pending-launch path) ────────────
  {
    const { context, page } = await newSeededPage(SEED_DEMO);
    for (const cta of INTEL_CTAS) {
      await page.goto(sectionUrl("battleplan"), { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForBattlePlan(page);
      await exerciseCta(page, cta, () => intelCtaButton(page, cta.card).click(), "demo-cold");
    }
    await context.close();
  }

  // ── Scenario B: demo, Progress pre-visited (warm path) ───────────────────
  {
    const { context, page } = await newSeededPage(SEED_DEMO);
    await page.goto(sectionUrl("progress"), { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000); // let the Progress section mount its tools once
    await page.goto(sectionUrl("battleplan"), { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForBattlePlan(page);
    for (const cta of INTEL_CTAS) {
      await exerciseCta(page, cta, () => intelCtaButton(page, cta.card).click(), "demo-warm");
      if (cta.section) {
        // SPA back-navigation keeps the same document — the warm condition
        // (cached chunks, previously-mounted section) survives.
        await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
        await page.waitForURL(/section=battleplan/, { timeout: 10000 }).catch(() => {});
        await waitForBattlePlan(page);
      } else {
        // Maturity opened a modal on this page — dismiss it for cleanliness.
        await dismissOverlays(page);
        await page.keyboard.press("Escape");
      }
    }
    await context.close();
  }

  // ── Scenario C: fabricated-session empty state (all "Run it now") ────────
  if (!projectRef) {
    console.log("NOTE: VITE_SUPABASE_URL not set — skipping the empty-state scenario.");
  } else {
    const seedEmpty = SEED_OVERLAYS + `
      localStorage.setItem("sb-${projectRef}-auth-token", ${JSON.stringify(JSON.stringify(fakeSession()))});
    `;
    const { context, page } = await newSeededPage(seedEmpty);
    for (const cta of INTEL_CTAS) {
      await page.goto(sectionUrl("battleplan"), { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForBattlePlan(page, { timeout: 45000 });
      await exerciseCta(page, cta, () => intelCtaButton(page, cta.card).click(), "empty-state");
    }
    // The empty campaign map offers its own CTA straight into the roadmap tool.
    await page.goto(sectionUrl("battleplan"), { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForBattlePlan(page, { timeout: 45000 });
    await exerciseCta(
      page,
      { ...CAMPAIGN_CTA, card: "Campaign map CTA" },
      () => page.getByRole("button", { name: CAMPAIGN_CTA.name }).click(),
      "empty-state",
    );
    await context.close();
  }

  // ── Scenario D: real signed-in account (persisted intel drives CTAs) ─────
  // Same credentials pattern as auth-smoke.mjs. Overlay-suppression keys are
  // still pre-seeded (this smoke's own approach), and signInAndDismissOverlays
  // handles the gate plus any post-sign-in overlays the seeds don't cover.
  {
    const EMAIL = process.env.SMOKE_EMAIL;
    const PASSWORD = process.env.SMOKE_PASSWORD;
    if (!EMAIL || !PASSWORD) {
      console.log("NOTE: SMOKE_EMAIL/SMOKE_PASSWORD not set — skipping the real signed-in scenario.");
    } else {
      const { context, page } = await newSeededPage(SEED_OVERLAYS);

      // Watch the user-state-get call that restores the battle plan slots
      // (useBattlePlanCache batches all 7 battleplan_* keys into one call —
      // other hooks also call user-state-get, so match on the request body).
      // An account with NO persisted slots has no intel to exercise: skip,
      // don't fail. (Audit existence is NOT the right gate — a seeded audit
      // can exist with every battle-plan slot still empty, and vice versa.)
      let battlePlanState = null; // key → persisted value, once captured
      page.on("response", (resp) => {
        if (!resp.url().includes("user-state-get")) return;
        if (!(resp.request().postData() ?? "").includes("battleplan_roast")) return;
        resp.json().then((j) => { battlePlanState = j?.state ?? {}; }).catch(() => {});
      });

      await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 30000 });
      let signedIn = false;
      try {
        await signInAndDismissOverlays(page, { email: EMAIL, password: PASSWORD });
        pass("[signed-in] sign-in gate cleared with real credentials");
        signedIn = true;
      } catch (err) {
        if (!(err instanceof SignInGateError)) throw err;
        fail(`[signed-in] ${err.message}`);
      }

      if (signedIn) {
        // useBattlePlanCache fires its batched restore on sign-in; the battle
        // plan page mounts it too, so navigate there and wait for the capture.
        await page.goto(sectionUrl("battleplan"), { waitUntil: "domcontentloaded", timeout: 30000 });
        await waitForBattlePlan(page, { timeout: 45000 });
        for (let i = 0; i < 40 && battlePlanState === null; i++) await page.waitForTimeout(500);

        if (battlePlanState === null) {
          fail("[signed-in] battle-plan user-state-get restore never observed — cannot judge persisted intel");
        } else {
          const persisted = INTEL_CTAS.filter((c) => battlePlanState[c.serverKey]);
          if (persisted.length === 0) {
            console.log("NOTE: smoke account has no persisted battle-plan intel yet — signed-in CTA scenario skipped (capture some intel on the smoke account to enable it).");
          } else {
            // Positive assertion first: every server-persisted slot must render
            // its card in the DONE state ("Open the tool"/"Rerun it") — the
            // restored-steps-map-to-wrong-launch-key regression shows up here
            // as a card wrongly reading "Run it now".
            for (const cta of persisted) {
              const label = ((await intelCtaButton(page, cta.card).textContent().catch(() => "")) ?? "").trim();
              if (/open the tool|rerun it/i.test(label)) {
                pass(`[signed-in] ${cta.card} renders persisted done state ("${label}")`);
              } else {
                fail(`[signed-in] ${cta.card} has persisted server intel (${cta.serverKey}) but its card reads "${label}" instead of Open the tool/Rerun it`);
              }
            }
            for (const cta of INTEL_CTAS) {
              await page.goto(sectionUrl("battleplan"), { waitUntil: "domcontentloaded", timeout: 30000 });
              await waitForBattlePlan(page, { timeout: 45000 });
              await exerciseCta(page, cta, () => intelCtaButton(page, cta.card).click(), "signed-in");
            }
          }
        }
      }
      await context.close();
    }
  }

  if (pageErrors.length) fail(`uncaught page errors: ${JSON.stringify(pageErrors.slice(0, 5))}`);
  else pass("no uncaught page errors");
  if (consoleErrors.length) fail(`browser console errors: ${JSON.stringify(consoleErrors.slice(0, 5))}`);
  else pass("no browser console errors");
} catch (err) {
  fail(`unexpected error: ${err?.message ?? err}`);
} finally {
  await browser.close();
}

console.log(issues.length ? `\n${issues.length} issue(s) found.` : "\nAll battle plan CTA smoke checks passed.");
process.exit(issues.length ? 1 : 0);
