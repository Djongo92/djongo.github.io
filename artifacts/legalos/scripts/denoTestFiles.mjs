// Single source of truth for "which edge-function tests are native Deno
// tests". A test file is a Deno test iff it calls Deno.test(...); every other
// *.test.ts under supabase/functions runs under vitest.
//
// Both runners derive their file sets from this, so neither list can drift:
//   - vitest.config.ts excludes exactly these files
//   - scripts/run-deno-tests.mjs (`pnpm run test:deno`) runs exactly these
// Before this existed both lists were hand-maintained, and two vitest-style
// files sat in the vitest exclude list with no runner at all.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FUNCTIONS_DIR = join(APP_ROOT, "supabase", "functions");

const DENO_TEST_CALL = /\bDeno\.test\s*\(/;

/** Every *.test.ts under supabase/functions, as POSIX paths relative to the app root. */
export function edgeTestFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".test.ts")) out.push(relative(APP_ROOT, full).split(sep).join("/"));
    }
  };
  walk(FUNCTIONS_DIR);
  return out.sort();
}

export function isDenoTestSource(source) {
  return DENO_TEST_CALL.test(source);
}

/** The native Deno.test files, as POSIX paths relative to the app root. */
export function denoTestFiles() {
  return edgeTestFiles().filter((f) => isDenoTestSource(readFileSync(join(APP_ROOT, f), "utf8")));
}
