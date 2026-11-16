// Offline browser check of the built site: every entry page renders in a real
// Chromium, served the way GitHub Pages serves it, with Supabase stubbed out.
//
// tests/entry-paths-smoke.mjs covers the same doors against the live project
// (real teaser runs, real demo codes) and so can't run on every PR. This one
// can: nothing leaves the machine. It catches what unit tests can't see:
//   - a page that throws while rendering (the error boundary shows) or a
//     blank page;
//   - an uncaught error or unhandled rejection in the browser;
//   - a lazily loaded page whose chunk is missing from the build;
//   - a deep link that doesn't survive a hard refresh (404.html fallback);
//   - a public page that downloads the dashboard code (the per-page split
//     in App.tsx regressing).
//
// Supabase stubs: REST reads answer an empty list, edge functions answer
// 503. Pages are expected to cope with both, which is the point.
//
// Usage (from the repo root, after `SITE_BASE=/ node scripts/build-site.mjs`):
//   node artifacts/legalos/tests/e2e-offline.mjs [site-dist]
// Needs a Chromium for playwright-core: `npx playwright-core install chromium`
// or CHROMIUM_PATH pointing at one.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright-core";

const ROOT = resolve(process.argv[2] ?? "site-dist");
if (!existsSync(join(ROOT, "app", "index.html"))) {
  console.error(`No built site at ${ROOT} (expected app/index.html). Run: SITE_BASE=/ node scripts/build-site.mjs`);
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".json": "application/json", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain",
};

// Like GitHub Pages: a file if it exists (dir → index.html), else 404.html
// with status 404 — which is how /app/<deep link> boots the app.
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(400).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  let status = 200;
  if (!existsSync(file)) { file = join(ROOT, "404.html"); status = 404; }
  res.writeHead(status, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--no-sandbox"],
});

const results = [];
const report = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * Opens `path` in a fresh profile and runs `expect(page)` (true = the page's
 * own content is there). Fails on page errors, the error boundary, a
 * browser error report, or a near-empty page.
 */
async function visit(name, path, expect, { publicPage = false } = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  const errorReports = [];
  const chunks = [];
  const missing = [];
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
  page.on("request", (r) => {
    const m = r.url().match(/\/assets\/([^/?]+)\.js/);
    if (m) chunks.push(m[1]);
  });
  page.on("response", (r) => {
    if (r.url().startsWith(BASE) && r.url().includes("/assets/") && r.status() >= 400) missing.push(r.url());
  });
  await context.route(/^https:\/\/[^/]+\.supabase\.co\//, (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const url = req.url();
    if (url.includes("/functions/v1/client-error-report")) {
      errorReports.push((req.postData() ?? "").slice(0, 200));
      return route.fulfill({ status: 202, headers: CORS, body: "" });
    }
    if (url.includes("/rest/v1/")) {
      return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json", "content-range": "*/0" }, body: "[]" });
    }
    return route.fulfill({ status: 503, headers: { ...CORS, "content-type": "application/json" }, body: '{"error":"offline test"}' });
  });
  // Anything else external (fonts, analytics) is irrelevant here.
  await context.route((url) => !url.href.startsWith(BASE) && !/\.supabase\.co\//.test(url.href), (r) => r.abort());

  try {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 30_000 });
    const own = await expect(page).catch(() => false);
    await page.waitForTimeout(500);
    const boundary = await page.getByText("Something went wrong on this page").isVisible().catch(() => false);
    const textLen = (await page.locator("body").innerText().catch(() => "")).trim().length;
    const problems = [];
    if (!own) problems.push("expected content not found");
    if (boundary) problems.push("error boundary shown");
    if (textLen < 40) problems.push(`page nearly empty (${textLen} chars)`);
    if (pageErrors.length) problems.push(`page errors: ${pageErrors.join(" | ")}`);
    if (errorReports.length) problems.push(`error reports sent: ${errorReports.join(" | ")}`);
    if (missing.length) problems.push(`missing assets: ${missing.join(", ")}`);
    if (publicPage && chunks.some((c) => /^Index-/.test(c))) problems.push("public page downloaded the dashboard chunk");
    report(name, problems.length === 0, problems.join("; "));
  } catch (e) {
    report(name, false, `threw: ${String(e).slice(0, 200)}`);
  } finally {
    await context.close();
  }
}

const visible = (locator) => locator.first().waitFor({ state: "visible", timeout: 15_000 }).then(() => true);

await visit("marketing home", "/", (p) => visible(p.locator('a[href*="/app"]')));
await visit("app entry (free score + sign in)", "/app/", (p) => visible(p.getByText("Sign in / create account")));
await visit("visibility index (deep link)", "/app/visibility-index/serbia",
  (p) => visible(p.locator("h1", { hasText: /visibility index/i })), { publicPage: true });
await visit("teaser", "/app/teaser", (p) => visible(p.locator("h1", { hasText: /teaser/i })), { publicPage: true });
await visit("demo gate", "/app/demo", (p) => visible(p.getByText("Access code")), { publicPage: true });
await visit("share link, unknown id", "/app/share/not-a-real-id", (p) => visible(p.locator("main, div").filter({ hasText: /./ })), { publicPage: true });
await visit("join link, invalid token", "/app/join/not-a-real-token", (p) => visible(p.locator("body").filter({ hasText: /./ })), { publicPage: true });
await visit("unknown app route", "/app/no-such-page", (p) => visible(p.locator("h1", { hasText: "404" })), { publicPage: true });

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
