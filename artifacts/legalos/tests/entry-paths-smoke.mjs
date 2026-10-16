// Entry-paths browser smoke: every door into the product, exercised in a real
// Chromium with fresh (first-visit) profiles.
//
// Born from a one-off QA pass that found two broken promises no unit test
// could see: "View Full Rankings" landing on a sign-in gate instead of the
// public leaderboard, and the teaser's "Get the full score" looping back to
// another teaser form. A renamed route or a dead CTA would break a funnel
// silently — this script is the standing guard.
//
// What it checks:
//   1. Marketing home renders; every CTA link to /app is enumerated from the
//      DOM (future CTAs are covered automatically) and each distinct
//      destination is visited in a fresh browser context and must render its
//      expected surface (leaderboard / demo gate / sign-in form / teaser /
//      app gate).
//   2. Hero domain input click-through: submitting a domain lands on
//      /app/teaser?domain=… and the teaser auto-runs (visibility-teaser fires
//      without further interaction).
//   3. Demo gate: renders; a wrong code is rejected (no grant); with
//      DEMO_ACCESS_CODES available, a valid code enters the demo, the guided
//      tour is OFFERED on first visit, and NOT re-offered after dismiss +
//      reload in the same browser.
//   4. Guidebook scroll restoration (needs DEMO_ACCESS_CODES): in demo mode,
//      scroll mid-chapter, reload → the reader lands back at the saved
//      offset (the useChapterScroll promise, end to end in real Chromium);
//      SPA navigation to another chapter lands at the top instead.
//   5. Graceful bad routes: /app/share/<invalid>, /app/join/<invalid>,
//      an unknown /app route, and /app/ops render content, not white-screens.
//   6. Every page: no console errors, no page errors, no failed requests.
//
// Prerequisites:
//   - Workflows running: `artifacts/legalos-marketing: web` (base /) and
//     `artifacts/legalos: web` (/app/). If the server is unreachable the
//     script SKIPS cleanly (exit 0) — a down dev server is not a product bug.
//   - Chromium from this workspace's Nix system deps (prebuilt Playwright
//     binaries fail on NixOS).
//   - DEMO_ACCESS_CODES (secret) for the full demo-entry + tour checks;
//     without it those checks skip with a NOTE (wrong-code rejection and the
//     gate itself still run).
//
// Run: pnpm --filter @workspace/legalos run smoke:paths
// Env: SMOKE_BASE_URL (default http://localhost:80).

import { chromium } from "playwright-core";
import { execSync } from "node:child_process";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:80";
// Never print the code — parse the first CODE:Label pair from the secret.
const demoCode = (process.env.DEMO_ACCESS_CODES ?? "").split(",")[0]?.split(":")[0]?.trim();

const results = [];
const report = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} [${name}] ${detail}`);
};
const note = (m) => console.log(`NOTE ${m}`);

// ── Pre-flight: skip cleanly when the dev servers aren't up ─────────────────
for (const path of ["/", "/app/"]) {
  try {
    const resp = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(8000) });
    if (resp.status >= 500) throw new Error(`HTTP ${resp.status}`);
  } catch (err) {
    console.log(`SKIP: dev server not reachable at ${BASE}${path} (${err.message}).`);
    console.log("Start the legalos-marketing and legalos workflows, then re-run smoke:paths.");
    process.exit(0);
  }
}

const execPath = execSync("which chromium").toString().trim();
const browser = await chromium.launch({ executablePath: execPath, args: ["--no-sandbox"] });

const NOISE = (s) => /favicon|\.map|React Router Future Flag/i.test(s);
// Expected-rejection noise: the browser auto-logs a console error for every
// HTTP 4xx resource response, and react-router logs its own 404-route line.
// Wrong-code rejections (401), invalid share/join lookups (400/404), and
// anonymous-edge-call 401s are PRODUCT behavior on the paths this smoke
// deliberately exercises — not regressions. The fatal classes stay: JS
// exceptions (pageerror), network-layer deaths (requestfailed — the CORS
// preflight signature), and any 5xx response.
const EXPECTED_REJECTION = (s) =>
  /Failed to load resource: the server responded with a status of 4\d\d/i.test(s) ||
  /404 Error: User attempted to access non-existent route/i.test(s);

/** Run one scenario in a fresh context; network/console hygiene is asserted automatically.
 *  allowRejections downgrades expected-4xx console noise to NOTEs — only for
 *  scenarios that DELIBERATELY exercise rejection paths (wrong codes, invalid
 *  tokens, anonymous edge calls). On happy paths an unexpected 4xx stays
 *  fatal: it can be the first sign of a dead endpoint.
 *  allow429 is narrower still: the teaser path calls Google PageSpeed, whose
 *  quota is shared — repeated smoke runs legitimately 429. Only that status
 *  is downgraded; any other 4xx on the path remains fatal.
 *  externalErrorPattern is the narrowest allowance: 5xx RESPONSES (and their
 *  console echoes) from endpoints matching the pattern — i.e. upstream
 *  scoring timeouts — are HELD rather than failed outright. They are
 *  downgraded to a NOTE only if the scenario body calls
 *  ctl.confirmExternalError() after observing the product's visible error
 *  state; a 5xx without a surfaced error state still fails. Unrelated 5xxs
 *  and network-layer deaths (requestfailed — the CORS signature) always
 *  stay fatal. */
async function scenario(name, fn, { allowRejections = false, allow429 = false, externalErrorPattern = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errs = { console: [], page: [], failedReq: [], server5xx: [] };
  const heldExternal = [];
  let externalConfirmed = false;
  let expectedRejections = 0;
  const isExternal = (url) => !!externalErrorPattern && !!url && externalErrorPattern.test(url);
  page.on("console", (m) => {
    if (m.type() !== "error" || NOISE(m.text())) return;
    if ((allowRejections && EXPECTED_REJECTION(m.text())) ||
        (allow429 && /status of 429/.test(m.text()))) { expectedRejections++; return; }
    if (/status of 5\d\d/i.test(m.text()) && isExternal(m.location()?.url)) {
      heldExternal.push(`console: ${m.text().slice(0, 120)}`);
      return;
    }
    errs.console.push(m.text().slice(0, 160));
  });
  page.on("pageerror", (e) => { if (!NOISE(String(e))) errs.page.push(String(e).slice(0, 160)); });
  page.on("requestfailed", (r) => { if (!NOISE(r.url())) errs.failedReq.push(`${r.url().slice(0, 110)} → ${r.failure()?.errorText}`); });
  page.on("response", (r) => {
    if (r.status() < 500 || NOISE(r.url())) return;
    if (isExternal(r.url())) heldExternal.push(`${r.status()} ${r.url().slice(0, 110)}`);
    else errs.server5xx.push(`${r.status()} ${r.url().slice(0, 110)}`);
  });
  const ctl = { confirmExternalError: () => { externalConfirmed = true; } };
  try {
    await fn(page, ctl);
  } catch (err) {
    report(name, false, `threw: ${String(err).slice(0, 250)}`);
  }
  for (const [kind, list] of Object.entries(errs)) {
    if (list.length) report(`${name}/${kind}`, false, `${list.length} issue(s): ${list.slice(0, 3).join(" | ")}`);
  }
  if (heldExternal.length) {
    if (externalConfirmed) {
      note(`[${name}] downgraded ${heldExternal.length} external 5xx signal(s) after confirmed error state`);
    } else {
      report(`${name}/external5xx`, false,
        `${heldExternal.length} 5xx from external-tolerant endpoint(s) WITHOUT a visible error state: ${heldExternal.slice(0, 2).join(" | ")}`);
    }
  }
  if (expectedRejections) note(`[${name}] ignored ${expectedRejections} expected 4xx-rejection console message(s)`);
  await context.close();
}

// ── 1. Marketing home + enumerate every app-bound CTA ───────────────────────
let ctaDestinations = [];
await scenario("marketing-home", async (page) => {
  const resp = await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
  report("marketing-home", resp && resp.status() < 400, `HTTP ${resp?.status()}, title "${await page.title()}"`);
  const links = await page.$$eval('a[href*="/app"]', (as) => as.map((a) => a.getAttribute("href")));
  ctaDestinations = [...new Set(links)];
  console.log(`  ${links.length} app-bound CTA(s), ${ctaDestinations.length} distinct destination(s): ${ctaDestinations.join(", ")}`);
  report("marketing-ctas", ctaDestinations.length >= 4, `${ctaDestinations.length} distinct destinations enumerated`);
});

// Legal hash routes render
for (const [name, hash, needle] of [["marketing-privacy", "/#/privacy", "Privacy"], ["marketing-terms", "/#/terms", "Terms"]]) {
  await scenario(name, async (page) => {
    await page.goto(`${BASE}/${hash}`, { waitUntil: "networkidle", timeout: 30000 });
    const found = await page.locator(`text=${needle}`).first().isVisible().catch(() => false);
    report(name, found, `${hash} renders (${needle} visible: ${found})`);
  });
}

// ── 2. Each enumerated destination must render its expected surface ─────────
const surfaceChecks = [
  { match: /visibility-index|recognition-index/, name: "leaderboard", check: async (page) => {
    // The exact regression this guards: a rankings CTA landing on the sign-in
    // gate. The gate has plenty of body text (a length check would pass on
    // it) — assert the index page's own h1, which the gate does not have.
    return page.locator("h1", { hasText: /visibility index/i }).first()
      .isVisible({ timeout: 15000 }).catch(() => false);
  } },
  { match: /\/app\/demo/, name: "demo-gate", check: async (page) =>
    page.locator("text=Access code").first().isVisible({ timeout: 15000 }).catch(() => false) },
  { match: /#signin/, name: "signin-form", check: async (page) =>
    page.locator('input[type="email"]').first().isVisible({ timeout: 15000 }).catch(() => false) },
  { match: /\/app\/teaser/, name: "teaser", check: async (page) =>
    page.locator('input[placeholder="yourlawfirm.com"]').first().isVisible({ timeout: 15000 }).catch(() => false) },
  { match: /^\/app\/?$/, name: "app-gate", check: async (page) =>
    page.locator("text=real visibility score").first().isVisible({ timeout: 15000 }).catch(() => false) },
];

for (const href of ctaDestinations) {
  const surface = surfaceChecks.find((s) => s.match.test(href));
  await scenario(`dest${href.replace(/[^a-z0-9]+/gi, "-")}`, async (page) => {
    const resp = await page.goto(`${BASE}${href}`, { waitUntil: "networkidle", timeout: 45000 });
    const okHttp = resp && resp.status() < 500;
    if (!surface) {
      // Unknown destination class: at minimum it must not white-screen.
      const len = await page.evaluate(() => document.body.innerText.trim().length);
      report(`dest:${href}`, okHttp && len > 80, `HTTP ${resp?.status()}, rendered ${len} chars (no surface assertion for this class)`);
      return;
    }
    const ok = await surface.check(page);
    report(`dest:${href}`, okHttp && ok, `HTTP ${resp?.status()}, ${surface.name} surface renders: ${ok}`);
  });
}

// ── 3. Hero domain click-through → teaser auto-run ──────────────────────────
await scenario("hero-domain-flow", async (page) => {
  let teaserFired = false;
  page.on("request", (r) => { if (r.url().includes("/functions/v1/visibility-teaser")) teaserFired = true; });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator('[data-testid="input-domain"]').first().fill("example.com");
  await page.locator('[data-testid="button-domain-submit"]').first().click();
  await page.waitForURL(/\/app\/teaser/, { timeout: 20000 }).catch(() => null);
  const landed = /\/app\/teaser\?domain=example\.com/.test(page.url());
  await page.waitForTimeout(8000);
  report("hero-domain-flow", landed, `hero submit landed on ${page.url()}`);
  report("teaser-autorun", teaserFired, `visibility-teaser auto-fired from ?domain= (no further click): ${teaserFired}`);
}, { allow429: true });

// ── 3b. OPT-IN (SMOKE_FULL_TEASER=1): full teaser → "Get the full score" → #signin ──
// hero-domain-flow proves the teaser FIRES; this leg proves the funnel step
// that was broken once already (the CTA looping back to another teaser
// form): completion → CTA → /app/#signin with the email form open and the
// audited domain carried into the signup prefill. One live teaser run takes
// 60-90s, so it's opt-in and the default smoke:paths run stays fast.
if (process.env.SMOKE_FULL_TEASER !== "1") {
  note("SMOKE_FULL_TEASER not set — skipping the full teaser → sign-in handoff leg (one live teaser run takes 60-90s).");
} else {
  await scenario("teaser-full-handoff", async (page, ctl) => {
    // domcontentloaded, NOT networkidle: the teaser auto-fires on mount and a
    // 60-90s scoring round-trip keeps the network busy, so a networkidle
    // wait would burn its 45s timeout before the completion window starts.
    await page.goto(`${BASE}/app/teaser?domain=example.com`, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Wait for the completion CTA OR an error state. An error here is an
    // external-dependency outcome (PSI quota, upstream timeouts), not a
    // product regression — skip the leg rather than fail it. NEITHER
    // appearing within 150s means the teaser run itself is broken.
    const cta = page.locator("button", { hasText: "Get the full score" });
    const completed = await cta.first().waitFor({ state: "visible", timeout: 150000 }).then(() => true).catch(() => false);
    if (!completed) {
      // The error state's TEXT is unpredictable — on a non-OK response the
      // component renders the edge function's own error string verbatim
      // (LiveScoreTeaser line ~102), so match the error element itself:
      // p.text-destructive is the only destructive paragraph on this page.
      const errored = await page.locator("p.text-destructive").first().isVisible().catch(() => false);
      if (errored) {
        // Confirms the error state so the scenario's held 5xx signals from
        // the scoring endpoint downgrade to a NOTE instead of failing.
        ctl.confirmExternalError();
        note("[teaser-full-handoff] teaser run errored (external scoring dependency) — skipping the handoff assertions this run");
        return;
      }
      report("teaser-completes", false, "teaser neither completed nor surfaced an error within 150s — the teaser run itself looks broken");
      return;
    }
    await cta.first().click();
    await page.waitForURL(/\/app\/#signin$/, { timeout: 15000 }).catch(() => null);
    const onSignin = /\/app\/#signin$/.test(page.url());
    const emailVisible = await page.locator('input[type="email"]').first().isVisible({ timeout: 15000 }).catch(() => false);
    report("handoff-signin-form", onSignin && emailVisible, `after CTA: url=${page.url()} (/#signin: ${onSignin}), email form visible: ${emailVisible}`);
    // The prefill contract: setAuditPrefill before navigate, consumed by the
    // post-signup audit intake (MarketVisibilityScore) — this is what stops
    // "create an account" from meaning "retype the domain we just measured".
    const prefill = await page.evaluate(() => {
      try { return JSON.parse(sessionStorage.getItem("legalos:audit_prefill") ?? "null"); } catch { return null; }
    });
    // auditedDomain is the normalized URL the teaser measured
    // ("https://example.com"), not the bare input — assert it carries the
    // domain, in whatever normalized form the intake form consumes.
    const carriesDomain = typeof prefill?.auditedDomain === "string" && prefill.auditedDomain.includes("example.com");
    report("handoff-prefill-domain", carriesDomain,
      `signup prefill carries the audited domain: ${JSON.stringify(prefill)}`);
  }, { allow429: true, externalErrorPattern: /\/functions\/v1\/visibility-teaser/ });
}

// ── 3c. The handoff leg's error path, induced on demand (fast — runs by
// default): a stubbed 504 from the scoring endpoint must surface the
// teaser's visible error state, and the external-error allowance must
// downgrade the held 5xx signals rather than fail them. This is what makes
// the live leg's "skip on external error" behavior verifiable without
// waiting for a real upstream outage. ─────────────────────────────────────
await scenario("teaser-external-error-skip", async (page, ctl) => {
  await page.route("**/functions/v1/visibility-teaser", (route) =>
    route.fulfill({ status: 504, contentType: "application/json", body: JSON.stringify({ error: "upstream timeout (smoke-stubbed)" }) }));
  await page.goto(`${BASE}/app/teaser?domain=example.com`, { waitUntil: "domcontentloaded", timeout: 45000 });
  const errored = await page.locator("p.text-destructive").first()
    .waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
  if (errored) ctl.confirmExternalError();
  report("teaser-error-state", errored, `stubbed 504 surfaces the teaser error state (error paragraph visible: ${errored})`);
}, { allow429: true, externalErrorPattern: /\/functions\/v1\/visibility-teaser/ });

// ── 4. Demo gate: wrong code rejected ───────────────────────────────────────
await scenario("demo-wrong-code", async (page) => {
  await page.goto(`${BASE}/app/demo`, { waitUntil: "networkidle", timeout: 45000 });
  const gateVisible = await page.locator("text=Access code").first().isVisible({ timeout: 15000 }).catch(() => false);
  report("demo-gate", gateVisible, `access-code gate renders: ${gateVisible}`);
  await page.locator('input[placeholder="Enter your code"]').fill("definitely-wrong-code-smoke");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  const granted = await page.evaluate(() => sessionStorage.getItem("legalos_showcase_grant"));
  const stillGate = await page.locator("text=Access code").first().isVisible().catch(() => false);
  report("demo-wrong-code", !granted && stillGate, `wrong code rejected (grant: ${granted}, gate still up: ${stillGate})`);
}, { allowRejections: true });

// ── 5. Full demo entry + tour first-visit contract (needs DEMO_ACCESS_CODES) ─
if (!demoCode) {
  note("DEMO_ACCESS_CODES not set — skipping valid-code demo entry and tour checks (gate + wrong-code checks already ran).");
} else {
  await scenario("demo-full-flow", async (page) => {
    // Live grant-validation + demo bootstrap edge calls can cold-start slowly;
    // give the dashboard real headroom and retry the entry once before
    // calling it broken.
    let entered = false;
    for (let attempt = 1; attempt <= 2 && !entered; attempt++) {
      await page.goto(`${BASE}/app/demo`, { waitUntil: "networkidle", timeout: 45000 });
      await page.locator('input[placeholder="Enter your code"]').fill(demoCode);
      await page.keyboard.press("Enter");
      entered = await page.waitForSelector('[data-coachmark="dashboard-score"]', { timeout: 45000 }).then(() => true).catch(() => false);
      if (!entered && attempt === 1) note("[demo-full-flow] first demo entry attempt timed out — retrying once");
    }
    report("demo-entry", entered, `valid code enters the demo (dashboard mounted: ${entered})`);
    if (!entered) return;
    const tourOffered = await page.locator("text=Take the 2-min tour").first().isVisible({ timeout: 15000 }).catch(() => false);
    report("demo-tour-first-visit", tourOffered, `guided tour offered on first demo visit: ${tourOffered}`);
    if (!tourOffered) return;
    // Dismiss via the real control — "Just explore" fires onDecline, which
    // persists the decision — and PROVE the welcome closed before reloading.
    // Otherwise a no-reoffer pass could be a stale modal surviving the reload.
    const dismissed = await page.getByRole("button", { name: "Just explore" }).click()
      .then(() => page.locator("text=Take the 2-min tour").first()
        .waitFor({ state: "hidden", timeout: 5000 }).then(() => true))
      .catch(() => false);
    report("demo-tour-dismissed", dismissed, `tour welcome actually closed via "Just explore": ${dismissed}`);
    if (!dismissed) return;
    await page.reload({ waitUntil: "networkidle" });
    // The reload re-runs the whole demo bootstrap (grant restore → demo data);
    // under live-function cold starts that can outlive one wait. Retry once,
    // and if it still fails capture what the page actually shows.
    let backOnDashboard = await page.waitForSelector('[data-coachmark="dashboard-score"]', { timeout: 45000 })
      .then(() => true).catch(() => false);
    if (!backOnDashboard) {
      note("[demo-full-flow] dashboard did not restore after first reload — reloading once more");
      await page.reload({ waitUntil: "networkidle" }).catch(() => null);
      backOnDashboard = await page.waitForSelector('[data-coachmark="dashboard-score"]', { timeout: 45000 })
        .then(() => true).catch(() => false);
    }
    if (!backOnDashboard) {
      const text = await page.evaluate(() => document.body.innerText.trim().slice(0, 300)).catch(() => "");
      note(`[demo-full-flow] post-reload state: url=${page.url()} body="${text}"`);
    }
    await page.waitForTimeout(2500);
    const tourAgain = await page.locator("text=Take the 2-min tour").first().isVisible().catch(() => false);
    report("demo-tour-no-reoffer", backOnDashboard && !tourAgain,
      `after dismiss + reload: dashboard back (${backOnDashboard}), tour re-offered (${tourAgain} — must be false)`);
  }, { allowRejections: true });

  // ── 5b. Guidebook scroll restoration, end to end ─────────────────────────
  // useChapterScroll's promise, proven in a real browser: scroll mid-chapter,
  // reload, land back at the saved offset; SPA-navigate to another chapter,
  // land at the top. The unit tests mock window.scrollTo — this leg guards
  // the real wiring (sessionStorage key, boot-URL capture, the lazy guidebook
  // section, entrance animations).
  await scenario("guidebook-scroll-restore", async (page) => {
    // Enter the demo (same grant flow as demo-full-flow, with the same
    // cold-start retry), then dismiss the tour offer if it appears.
    let entered = false;
    for (let attempt = 1; attempt <= 2 && !entered; attempt++) {
      await page.goto(`${BASE}/app/demo`, { waitUntil: "networkidle", timeout: 45000 });
      await page.locator('input[placeholder="Enter your code"]').fill(demoCode);
      await page.keyboard.press("Enter");
      entered = await page.waitForSelector('[data-coachmark="dashboard-score"]', { timeout: 45000 }).then(() => true).catch(() => false);
    }
    if (!entered) {
      report("guidebook-scroll-restore", false, "could not enter the demo after two attempts");
      return;
    }
    const dismissTour = async () => {
      const btn = page.getByRole("button", { name: "Just explore" });
      if (await btn.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false)) {
        await btn.click();
      }
    };
    await dismissTour();

    // A full document load with the chapter in the boot URL — the restore
    // path keys off it (getPageLoadChapterId reads window.location.search).
    // The demo app itself runs at /app/ (ShowcaseGate enters via
    // window.location.replace(BASE_URL)); the grant is in sessionStorage.
    await page.goto(`${BASE}/app/?section=guidebook&chapter=event-marketing`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissTour();
    const chapterMarker = page.locator("text=Maximizing Event Participation").first();
    const chapterOpen = await chapterMarker.waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
    report("guidebook-chapter-opens", chapterOpen, `chapter opens from boot URL (?section=guidebook&chapter=…): ${chapterOpen}`);
    if (!chapterOpen) return;

    // Scroll to a mid-chapter offset, let the rAF-throttled save land, and
    // read back what was actually saved — the assertion target for restore.
    const target = await page.evaluate(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const y = Math.round(Math.min(1600, maxScroll * 0.5));
      window.scrollTo(0, y);
      return y;
    });
    await page.waitForTimeout(400); // a rAF tick + margin
    const saved = await page.evaluate(() => {
      try { return JSON.parse(sessionStorage.getItem("legalos_chapter_scroll") ?? "{}")["event-marketing"] ?? null; }
      catch { return null; }
    });
    const savedOk = typeof saved === "number" && Math.abs(saved - target) <= 50;
    report("guidebook-scroll-saved", savedOk, `scroll position saved to sessionStorage (target ${target}, saved ${saved})`);
    if (typeof saved !== "number") return;

    // Reload: the restore fires two instant jumps — one on mount, one ~0.9s
    // later once the entrance animations stop nudging layout. Wait past both.
    await page.reload({ waitUntil: "domcontentloaded" });
    await chapterMarker.waitFor({ state: "visible", timeout: 30000 }).catch(() => null);
    await page.waitForTimeout(1600);
    const restoredY = await page.evaluate(() => window.scrollY);
    const maxAfter = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    // Tolerance covers font/layout shifts; also accept the clamped-to-bottom
    // case when the reloaded page ended up shorter than the saved offset.
    const restored = Math.abs(restoredY - saved) <= 250 || (saved > maxAfter && restoredY === maxAfter);
    report("guidebook-reload-restores", restored, `after reload: scrollY=${restoredY}, saved=${saved} (tolerance 250, max ${maxAfter})`);

    // Negative case: in-app navigation to a DIFFERENT chapter starts at the
    // top — restore is reload-only by design (goToChapter scrolls to 0,0 and
    // the one-shot restore is already consumed). "Next Chapter" is the app's
    // own chapter-to-chapter control (the bottom back link only renders on
    // the last chapter; event-marketing has a successor).
    const nextButton = page.getByRole("button", { name: "Next Chapter" }).first();
    const nextReady = await nextButton.waitFor({ state: "visible", timeout: 15000 }).then(() => true).catch(() => false);
    if (!nextReady) {
      report("guidebook-nav-starts-at-top", false, `"Next Chapter" control did not render`);
      return;
    }
    await nextButton.click();
    const otherOpen = await page.locator("text=Google Search Console 101").first()
      .waitFor({ state: "visible", timeout: 15000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(600); // past the first rAF restore window
    const navY = await page.evaluate(() => window.scrollY);
    report("guidebook-nav-starts-at-top", otherOpen && navY <= 50,
      `after SPA navigation to the next chapter: opened (${otherOpen}), scrollY=${navY} (must be ~0)`);
  }, { allowRejections: true });
}

// ── 6. Graceful bad routes ──────────────────────────────────────────────────
for (const [name, path] of [
  ["share-invalid", "/app/share/smoke-nonexistent-share-id"],
  ["join-invalid", "/app/join/smoke-invalid-token"],
  ["unknown-route", "/app/definitely-not-a-page"],
  ["ops-anon", "/app/ops"],
]) {
  await scenario(name, async (page) => {
    const resp = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    const len = await page.evaluate(() => document.body.innerText.trim().length);
    report(name, resp && resp.status() < 500 && len > 0, `HTTP ${resp?.status()}, rendered ${len} chars (no white-screen)`);
  }, { allowRejections: true });
}

await browser.close();
const fails = results.filter((r) => !r.ok);
console.log(`\n═══ ENTRY-PATHS SMOKE: ${results.length - fails.length}/${results.length} passed ═══`);
if (fails.length) {
  console.log("Failures:");
  for (const f of fails) console.log(`  - [${f.name}] ${f.detail}`);
}
process.exit(fails.length ? 1 : 0);
