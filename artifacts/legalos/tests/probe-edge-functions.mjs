// Probe every edge function the client actually calls against the live
// hosted Supabase project, so an undeployed-but-called function is caught
// before users hit dead calls (see edgeFunctionAvailability.ts).
//
// How it works:
//   1. Statically extracts every function slug referenced from src/:
//      - `functions/v1/<slug>` literals
//      - fnUrl("<slug>") calls (workshop tools)
//      - dynamic call sites via slug constants, e.g.
//        `const FUNCTION_NAME = "firm-profile"` or `const ITEMS_FN = "..."`
//        (any const whose name ends in FUNCTION_NAME or _FN)
//   2. Sends an unauthenticated POST to each: 404 = undeployed,
//      any other HTTP status = deployed and responding.
//   3. Cross-checks the result against KNOWN_UNDEPLOYED in
//      src/lib/edgeFunctionAvailability.ts:
//      - a live function listed there  → stale entry (fail)
//      - a dead function not listed    → missing entry (fail)
//
// Run (repeatable after any deployment):
//   pnpm --filter @workspace/legalos run probe:functions
//
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (both non-secret,
// already present in the workspace environment).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Extraction (exported for tests) ─────────────────────────────────────────

const SLUG_RE = /functions\/v1\/([a-z0-9-]+)/g;
const FNURL_RE = /fnUrl\(\s*"([a-z0-9-]+)"/g;
// Dynamic call sites assign the slug to a constant. Convention (enforced by
// the test next to this script): the constant name ends in FUNCTION_NAME or
// _FN so the extractor can see it.
const CONST_RE = /(?:FUNCTION_NAME|[A-Z0-9_]*_FN)\s*=\s*"([a-z0-9-]+)"/g;

/** Extract every called-function slug from one source file's text. */
export const extractSlugsFromSource = (text) => {
  const slugs = new Set();
  for (const re of [SLUG_RE, FNURL_RE, CONST_RE]) {
    for (const m of text.matchAll(re)) slugs.add(m[1]);
  }
  return slugs;
};

/** Walk a src directory and collect every called-function slug. */
export const collectCalledSlugs = (srcDir) => {
  const slugs = new Set();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
        for (const s of extractSlugsFromSource(readFileSync(p, "utf8"))) slugs.add(s);
      }
    }
  };
  walk(srcDir);
  return slugs;
};

/** Parse the KNOWN_UNDEPLOYED set out of edgeFunctionAvailability.ts source. */
export const parseKnownUndeployed = (availSource) => {
  const setBody = availSource.match(/KNOWN_UNDEPLOYED[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
  return new Set([...setBody.matchAll(/^\s*"([a-z0-9-]+)",?\s*$/gm)].map((m) => m[1]));
};

/**
 * Classify one probe result. Returns { ok, message }.
 * Fails on: dead-and-unlisted (users hit dead calls) and
 * live-but-still-listed (feature disabled needlessly).
 */
export const classifyProbeResult = (slug, status, knownUndeployed) => {
  if (status === null) return { ok: false, message: `${slug}: network error` };
  if (status === 404) {
    return knownUndeployed.has(slug)
      ? { ok: true, message: `${slug}: 404 (undeployed, listed in KNOWN_UNDEPLOYED — UI degrades gracefully)` }
      : { ok: false, message: `${slug}: 404 — NOT deployed and NOT in KNOWN_UNDEPLOYED (users hit dead calls)` };
  }
  return knownUndeployed.has(slug)
    ? { ok: false, message: `${slug}: HTTP ${status} — live but still listed in KNOWN_UNDEPLOYED (stale entry, feature disabled needlessly)` }
    : { ok: true, message: `${slug}: HTTP ${status} — deployed` };
};

// ── Main (only when executed directly) ───────────────────────────────────────

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error("FATAL: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set.");
    process.exit(1);
  }

  const slugs = [...collectCalledSlugs(join(ROOT, "src"))].sort();
  const knownUndeployed = parseKnownUndeployed(
    readFileSync(join(ROOT, "src", "lib", "edgeFunctionAvailability.ts"), "utf8"),
  );

  console.log(`Probing ${slugs.length} called edge functions against ${new URL(SUPABASE_URL).hostname} ...\n`);

  const results = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY },
          body: JSON.stringify({}),
        });
        return { slug, status: resp.status };
      } catch (err) {
        return { slug, status: null, error: err.message };
      }
    }),
  );

  const issues = [];
  for (const { slug, status, error } of results) {
    const { ok, message } = classifyProbeResult(slug, status, knownUndeployed);
    if (ok) console.log(`OK    ${message}`);
    else {
      const full = error ? `${message} — ${error}` : message;
      issues.push(full);
      console.error(`FAIL  ${full}`);
    }
  }

  console.log(issues.length
    ? `\n${issues.length} issue(s):\n- ${issues.join("\n- ")}`
    : "\nAll called edge functions are consistent with KNOWN_UNDEPLOYED.");
  process.exit(issues.length ? 1 : 0);
}
