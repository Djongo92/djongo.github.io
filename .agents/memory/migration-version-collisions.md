---
name: Migration version collisions after task merges
description: Two branches can ship migrations with the same timestamp version; how to detect and repair.
---

Rule: every migration in `artifacts/legalos/supabase/migrations/` must have a unique timestamp version. Parallel tasks that each add a migration can merge into a duplicate version.

**Why:** the schema-drift vitest (`tests/schema-drift.test.ts`) asserts version uniqueness and fails the whole `legalos-test` validation gate for whichever task merges second — even if that task never touched migrations.

**How to apply:** if the uniqueness assertion fails, rename the later-merged file to a fresh, strictly later timestamp (its SQL is usually already applied to prod under the old version). Then repair the ledger with `node tests/schema-drift-check.mjs --seed-ledger` (needs VITE_SUPABASE_URL + SUPABASE_ACCESS_TOKEN); it backfills the renamed version without touching existing rows. Also grep for references to the old filename/version before renaming.

Related reviewer lesson for peer-stat gate tests: sentinel-absence checks on interpolated stats (median/p90) prove nothing — a leaked value shifts the percentile to an interpolated number, never the sentinel itself. Assert exact expected values over the clean set instead.
