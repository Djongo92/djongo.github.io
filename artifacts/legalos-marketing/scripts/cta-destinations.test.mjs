// Task #182 — every marketing CTA keeps delivering what it promises.
//
// Task #174 hand-audited each data-testid="link-*" CTA and confirmed its
// destination matches its promise (teaser CTAs → /app/teaser, sign-up CTAs →
// /app/#signin, leaderboard CTAs → the public visibility index, demo CTAs →
// /app/demo). This test pins that audit: it statically scans src/ for every
// link-* testid, resolves the href of the tag that carries it, and asserts it
// against an explicit expected-destination map.
//
// Adding a new link-* CTA without registering it here fails the test, as does
// removing or re-pointing a registered one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

// The audited promise → destination map. Keep comments honest: they say what
// the button promises, so a mismatch is legible as a broken promise, not just
// a failed string compare.
const EXPECTED = {
  // "Run your free audit" style CTAs — land on the no-signup teaser.
  "link-how-audit": "/app/teaser",
  "link-score-audit": "/app/teaser",
  "link-your-firm-audit": "/app/teaser",
  "link-battleplan-app": "/app/teaser",
  "link-pricing-free": "/app/teaser",
  "link-sticky-cta": "/app/teaser",
  // Sign-up / behind-auth CTAs — land on the sign-in form, not the gate hero.
  "link-workshop-app": "/app/#signin",
  "link-pricing-full": "/app/#signin",
  // Public leaderboard CTAs — rankings are public, no sign-in gate.
  "link-benchmark-app": "/app/visibility-index/serbia?live=1",
  "link-directory-leaderboard": "/app/visibility-index/serbia?live=1",
  // Full-demo CTAs — rendered by DemoLink, whose anchor points at DEMO_URL.
  "link-demo": "/app/demo",
  "link-nav-demo": "/app/demo",
  "link-nav-demo-mobile": "/app/demo",
  // Footer / static destinations.
  "link-benchmarks": "/benchmarks/",
  "link-guidebook": "/guidebook/",
  "link-privacy": "#/privacy",
  "link-terms": "#/terms",
  "link-dpa": "#/dpa",
  "link-support": "mailto:support@uvid.com",
  // Legal pages: back link clears the hash via onClick; the anchor itself is "#".
  "link-legal-back": "#",
  // Footer legal / support links.
  "link-dpa": "#/dpa",
  "link-support": "mailto:support@uvid.com",
};

function sourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) out.push(p);
  }
  return out;
}

// DemoLink renders its own anchor with href={DEMO_URL}; resolve that constant
// from source so this test tracks the real destination, not a copy of it.
function demoUrl() {
  const src = readFileSync(path.join(SRC, "components", "DemoLaunch.tsx"), "utf8");
  const m = src.match(/const DEMO_URL\s*=\s*(?:site\()?['"]([^'"]+)['"]/);
  assert.ok(m, "DEMO_URL constant not found in DemoLaunch.tsx");
  return m[1];
}

/** Find every JSX opening tag carrying data-testid="link-*" and resolve its href. */
function collectCtas() {
  const found = new Map(); // testid -> { href, file }
  const DEMO_URL = demoUrl();
  for (const file of sourceFiles(SRC)) {
    const src = readFileSync(file, "utf8");
    const re = /data-testid="(link-[^"]+)"/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const testid = m[1];
      // Enclosing opening tag: nearest '<' before the match, nearest '>' after.
      const start = src.lastIndexOf("<", m.index);
      const end = src.indexOf(">", m.index);
      assert.ok(start >= 0 && end > start, `${testid}: cannot locate enclosing tag in ${file}`);
      const tag = src.slice(start, end + 1);
      const tagName = tag.match(/^<\s*([A-Za-z][\w.]*)/)?.[1];

      let href;
      // A literal href, or one routed through site() (the deploy-base helper).
      const literal = tag.match(/\bhref="([^"]*)"/) ?? tag.match(/\bhref=\{site\(["'`]([^"'`]*)["'`]\)\}/);
      if (literal) {
        href = literal[1];
      } else if (tagName === "DemoLink") {
        href = DEMO_URL;
      } else if (/\bhref=\{DEMO_URL\}/.test(tag)) {
        href = DEMO_URL;
      }
      assert.ok(
        href !== undefined,
        `${testid} in ${path.relative(SRC, file)}: could not statically resolve href from tag:\n${tag}`,
      );
      assert.ok(
        !found.has(testid),
        `duplicate data-testid "${testid}" (${found.get(testid)?.file} and ${file})`,
      );
      found.set(testid, { href, file: path.relative(SRC, file) });
    }
  }
  return found;
}

const ctas = collectCtas();

test("every link-* CTA in src/ is registered in the expected-destination map", () => {
  const unregistered = [...ctas.keys()].filter((id) => !(id in EXPECTED));
  assert.deepEqual(
    unregistered,
    [],
    `New CTA(s) found without a registered destination: ${unregistered.join(", ")}. ` +
      "Audit where each one should land and add it to EXPECTED in this test.",
  );
});

test("every registered CTA still exists in src/", () => {
  const missing = Object.keys(EXPECTED).filter((id) => !ctas.has(id));
  assert.deepEqual(
    missing,
    [],
    `Registered CTA(s) no longer found in src/: ${missing.join(", ")}. ` +
      "If the CTA was removed on purpose, remove its entry from EXPECTED.",
  );
});

for (const [testid, expectedHref] of Object.entries(EXPECTED)) {
  test(`${testid} → ${expectedHref}`, () => {
    const actual = ctas.get(testid);
    if (!actual) return; // reported by the "still exists" test
    assert.equal(
      actual.href,
      expectedHref,
      `${testid} (${actual.file}) promises ${expectedHref} but points at ${actual.href}`,
    );
  });
}
