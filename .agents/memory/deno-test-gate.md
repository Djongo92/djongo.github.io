---
name: Deno test gate for edge-function code
description: How tests for esm.sh/Deno-global edge modules actually get executed
---

Edge-function modules that transitively import from esm.sh or read `Deno.env` at import time cannot run under the Node vitest suite. Test files for them are excluded in the legalos vitest config and must be written as **native `Deno.test`** (std assert), run by the `test:deno` package script and the `test-deno` validation command — vitest-style excluded files with no runner are dead coverage and get rejected in review.

**Why:** the vitest exclude list alone silently ships untested code; a completion review rejected exactly that.

**How to apply:** new test for such a module → native `Deno.test` file next to it, add it to the `test:deno` script's file list, keep the vitest exclusion, and set `sanitizeOps/sanitizeResources: false` when the code under test uses `AbortSignal.timeout` or supabase-js timers. Set required env via `Deno.env.set` **before** a dynamic `await import()` of the module (some modules snapshot env at import). Everything the module touches goes through `fetch`, so a global fetch router (Supabase REST + external APIs) is enough — no module mocking.
