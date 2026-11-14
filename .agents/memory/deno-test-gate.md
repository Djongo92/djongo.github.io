---
name: Deno test gate for edge-function code
description: How tests for esm.sh/Deno-global edge modules actually get executed
---

Edge-function modules that transitively import from esm.sh or read `Deno.env` at import time cannot run under the Node vitest suite. Test files for them are excluded in the legalos vitest config and must be written as **native `Deno.test`** (std assert), run by the `test:deno` package script and the `test-deno` validation command — vitest-style excluded files with no runner are dead coverage and get rejected in review.

**Why:** the vitest exclude list alone silently ships untested code; a completion review rejected exactly that.

**How to apply:** new test for such a module → native `Deno.test` file next to it. Nothing to register: `scripts/denoTestFiles.mjs` classifies by content (`Deno.test(` → Deno, else vitest), so `test:deno` picks it up and vitest excludes it automatically (since 2026-11-03; before that both lists were manual and two vitest files sat excluded with no runner). Prefer a vitest test when the module's only Deno dependency is esm.sh supabase-js — vitest aliases it to the npm package. CI runs `test:deno` (which also type-checks the edge modules). Then and set `sanitizeOps/sanitizeResources: false` when the code under test uses `AbortSignal.timeout` or supabase-js timers. Set required env via `Deno.env.set` **before** a dynamic `await import()` of the module (some modules snapshot env at import). Everything the module touches goes through `fetch`, so a global fetch router (Supabase REST + external APIs) is enough — no module mocking.
