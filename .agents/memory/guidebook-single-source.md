---
name: Guidebook single source of truth
description: The web guidebook is canonical; the mobile chapter data is a generated projection guarded by a parity test — never hand-edit mobile chapters.
---

The guidebook lives as one module per chapter in `artifacts/legalos/src/data/chapters/` (types in `types.ts`, barrel at `src/data/chapters.ts`). The mobile app's `artifacts/legalos-mobile/data/chapters.ts` is GENERATED from the web book — never edit it by hand.

**Why:** Mobile previously kept an independent copy; it silently drifted to the old tone and 14 chapters while web moved to 21. Code review caught it; the fix was a projection, not a port.

**How to apply:**
- Edit chapters only on the web side, then run `pnpm --filter @workspace/legalos run generate:mobile-chapters`.
- `src/lib/mobileChaptersParity.test.ts` (web suite) fails the build if the mobile file drifts byte-for-byte.
- The projection folds rubric-only fields (artifacts, proofMetric, stat sources, deepDive) into plain mobile sections; mobile callouts only support `insight | pro-tip | mistake | quick-win` — other types throw at generation time.
- All chapters must satisfy `chapters.rubric.test.ts`: categories, proofMetric, ≥1 artifact, all 3 action-item priorities, sourced `stat` elements; partition test forces every chapter into RUBRIC_DONE (new chapters can never hide in the allowlist — ORIGINAL_LEGACY_IDS is frozen).
- Note: vitest rewrites `import.meta.url` to a non-file scheme in this repo — read files in tests via `resolve(process.cwd(), ...)`, not `new URL(..., import.meta.url)`.
- The marketing site's static excerpt pages (`legalos-marketing/public/guidebook/*.html`) are also GENERATED — template lives in `artifacts/legalos/scripts/guidebookPageRender.mjs`, emitted by `scripts/generate-guidebook-pages.mjs` (package `@workspace/uvid`). Design/palette/copy changes belong in the template; `check:guidebook-pages` regenerates and `git diff`s, so it fails until the regeneration is committed, and it silently reverts hand-edited HTML on the next run. Same regenerate-and-diff pattern guards `trackedFirms.ts`, `guidebookMeta.ts`, and `benchmarkLeaders.ts` on the marketing side (run by `predev`, so the dev workflow rewrites them on restart — commit regenerated output before restarting or it shows as a dirty tree).
