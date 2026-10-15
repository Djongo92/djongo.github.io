// Mobile (390px) smoke test for the LegalOS marketing site.
//
// Verifies every section and interactive element at a real phone-size
// viewport: hamburger drawer, hero domain input, firm checker, FAQ,
// email capture, legal pages, sticky CTA, horizontal overflow, and
// tap-target sizes.
//
// Prerequisites:
//   - Workflows running: `artifacts/legalos-marketing: web`,
//     `artifacts/legalos: web` (domain submit navigates to /app/teaser),
//     and `artifacts/api-server: API Server` (email capture POST).
//   - Dev DB schema pushed (`pnpm --filter @workspace/db push`,
//     also run automatically by scripts/post-merge.sh).
//   - Chromium: this workspace's Nix `chromium` system dependency
//     (prebuilt Playwright/Sparticuz binaries fail on NixOS).
//
// Run: pnpm --filter @workspace/legalos-marketing run test:mobile

import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:80';
const issues = [];
const pass = m => console.log('PASS', m);
const fail = m => { issues.push(m); console.log('FAIL', m); };

async function checkOverflow(page, label) {
  const w = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    inner: window.innerWidth,
  }));
  if (w.doc > w.inner + 1 || w.body > w.inner + 1) {
    fail(`${label}: horizontal overflow doc=${w.doc} body=${w.body} vw=${w.inner}`);
  } else {
    pass(`${label}: no horizontal overflow (doc=${w.doc}, vw=${w.inner})`);
  }
}

async function checkTapTargets(page, label) {
  const small = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a,button,input').forEach(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || r.width === 0 || r.height === 0) return;
      // skip elements intentionally hidden from users (e.g. bot honeypot fields)
      if (el.tabIndex < 0 || el.closest('[aria-hidden="true"]')) return;
      if (r.height < 32 && r.width < 32) {
        out.push(`${el.tagName} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return out;
  });
  if (small.length) fail(`${label}: small tap targets: ${JSON.stringify(small)}`);
  else pass(`${label}: no tiny tap targets`);
}

const execPath = execSync('which chromium').toString().trim();
const browser = await chromium.launch({ executablePath: execPath, args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
});
page.on('pageerror', e => fail('page error: ' + e.message));

try {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // ── Full-page scroll: triggers reveal animations, then overflow + tap targets ──
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate(v => window.scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(600);
  await checkOverflow(page, 'landing full-scroll');
  await checkTapTargets(page, 'landing');

  // ── Sticky CTA ──
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(600);
  (await page.getByTestId('link-sticky-cta').isVisible().catch(() => false))
    ? pass('sticky CTA visible mid-page') : fail('sticky CTA not visible mid-page');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);
  (await page.getByTestId('link-sticky-cta').isVisible().catch(() => false))
    ? fail('sticky CTA still visible at bottom') : pass('sticky CTA hides near bottom');

  // ── Hamburger drawer ──
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const burger = page.getByTestId('button-mobile-menu');
  (await burger.isVisible()) ? pass('hamburger visible at 390px') : fail('hamburger not visible');
  await burger.click();
  await page.waitForTimeout(500);
  const drawerLinks = await page.locator('nav a:visible').count();
  drawerLinks >= 7 ? pass(`drawer open with ${drawerLinks} links`) : fail(`drawer links visible: ${drawerLinks}`);
  await checkOverflow(page, 'drawer open');
  await page.locator('nav a[href="#pricing"]:visible').click();
  await page.waitForTimeout(800);
  ((await page.locator('nav a[href="#faq"]:visible').count()) === 0)
    ? pass('drawer closes after link tap') : fail('drawer did not close');
  (await page.evaluate(() => document.getElementById('pricing').getBoundingClientRect().top < window.innerHeight))
    ? pass('nav link scrolled to #pricing') : fail('did not scroll to #pricing');

  // ── Hero domain input ──
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByTestId('input-domain').first().fill('notadomain');
  await page.getByTestId('button-domain-submit').first().click();
  await page.waitForTimeout(300);
  (await page.locator('#domain-error').first().isVisible())
    ? pass('domain input shows validation error') : fail('no domain validation error');
  await page.getByTestId('input-domain').first().fill('https://www.myfirm.rs/about');
  await Promise.all([
    page.waitForURL('**/app/teaser*', { timeout: 8000 })
      .then(() => pass('domain submit navigates to ' + page.url()))
      .catch(() => fail('domain submit did not navigate')),
    page.getByTestId('button-domain-submit').first().click(),
  ]);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // ── Firm checker ──
  await page.getByTestId('input-firm-name').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  for (const [q, expected] of [
    ['Karanovic', 'Ranked'],
    ['BDK', 'Ranked'],
    ['Zivkovic', 'tracked'],
    ['Random Legal LLC', 'Not among'],
  ]) {
    await page.getByTestId('input-firm-name').fill(q);
    await page.getByTestId('button-firm-check').click();
    await page.waitForTimeout(500);
    const txt = (await page.getByTestId('text-firm-result').textContent().catch(() => '')) || '';
    txt.toLowerCase().includes(expected.toLowerCase())
      ? pass(`firm checker "${q}" -> contains "${expected}"`)
      : fail(`firm checker "${q}" -> got: ${txt.slice(0, 120)}`);
  }
  await checkOverflow(page, 'firm checker result');

  // ── FAQ ──
  await page.getByTestId('button-faq-1').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.getByTestId('button-faq-1').click();
  await page.waitForTimeout(400);
  (await page.locator('#faq-panel-1').isVisible()) ? pass('FAQ item expands') : fail('FAQ item did not expand');
  await page.getByTestId('button-faq-1').click();
  await page.waitForTimeout(400);
  ((await page.locator('#faq-panel-1').count()) === 0) ? pass('FAQ item collapses') : fail('FAQ item did not collapse');
  await checkOverflow(page, 'FAQ expanded');

  // ── Email capture ──
  await page.getByTestId('input-email').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.getByTestId('input-email').fill('bademail');
  await page.getByTestId('button-email-submit').click();
  await page.waitForTimeout(300);
  (await page.getByTestId('input-email').evaluate(el => !el.checkValidity()))
    ? pass('invalid email blocked by native validation') : fail('invalid email not blocked');
  await page.getByTestId('input-email').fill(`mobiletest+${Date.now()}@example.com`);
  await page.getByTestId('button-email-submit').click();
  await page.waitForTimeout(3500);
  (await page.getByTestId('text-email-success').isVisible().catch(() => false))
    ? pass('email capture submits and shows success state')
    : fail('email capture failed: ' + (await page.locator('#email-error').textContent().catch(() => 'no error text')));

  // ── Legal pages ──
  for (const kind of ['privacy', 'terms']) {
    await page.goto(BASE + '/#/' + kind, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const chars = await page.evaluate(() => document.body.innerText.length);
    chars > 500 ? pass(`legal page ${kind} renders (${chars} chars)`) : fail(`legal page ${kind} looks empty`);
    await checkOverflow(page, `legal ${kind}`);
  }
} finally {
  await browser.close();
}

console.log('\n=== SUMMARY ===', issues.length === 0 ? 'ALL PASS' : `${issues.length} FAILURES`);
issues.forEach(i => console.log('ISSUE:', i));
process.exit(issues.length === 0 ? 0 : 1);
