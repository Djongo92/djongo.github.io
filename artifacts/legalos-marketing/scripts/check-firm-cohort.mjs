#!/usr/bin/env node
// check:cohort — fails the build when the tracked-firm directory (the
// migration-replayed cohort that generate:firms emits) and the published
// audit pool (the census leaderboard snapshot that feeds SCORED_FIRMS,
// the histogram, and every percentile/average claim) diverge.
//
// Rules:
//   1. Every published firm must be a tracked firm — a published audit for
//      an untracked name means the directory is missing a firm.
//   2. Every tracked firm must be published OR explicitly listed in
//      src/data/unscoredTrackedFirms.json with a reason.
//   3. The allowlist may not contain stale entries: names that are no longer
//      tracked, or firms that HAVE gained a published audit.
//
// Run: pnpm run check:cohort (also part of prebuild, so a divergent cohort
// can never reach a production build).

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeFirms } from "./generate-tracked-firms.mjs";

/**
 * Pure reconciliation: returns a list of human-readable errors (empty =
 * cohorts reconcile).
 */
export function reconcileCohort(trackedNames, snapshot, unscoredAllowlist) {
  const errors = [];
  if (!snapshot || !Array.isArray(snapshot.firms) || snapshot.firms.length === 0) {
    return [
      "leaderboard snapshot has no firms array (old format?) — re-run pnpm --filter @workspace/uvid run census:snapshot to regenerate it",
    ];
  }
  const tracked = new Set(trackedNames);
  const published = new Set(snapshot.firms.map((f) => String(f.name)));
  const allow = new Set(Object.keys(unscoredAllowlist).filter((k) => k !== "_comment"));

  for (const name of published) {
    if (!tracked.has(name)) {
      errors.push(`published audit for untracked firm: '${name}' — add it to the market_directory_data migrations (or unpublish the audit)`);
    }
  }
  for (const name of tracked) {
    if (!published.has(name) && !allow.has(name)) {
      errors.push(`tracked firm has no published audit: '${name}' — publish an audit or add it to src/data/unscoredTrackedFirms.json with a reason`);
    }
  }
  for (const name of allow) {
    if (!tracked.has(name)) {
      errors.push(`stale unscoredTrackedFirms entry: '${name}' is not a tracked firm — remove it`);
    } else if (published.has(name)) {
      errors.push(`stale unscoredTrackedFirms entry: '${name}' now HAS a published audit — remove it`);
    }
  }
  return errors;
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = resolve(here, "../../legalos/supabase/migrations");
  const snapshotPath = process.env.LEGALOS_LEADERBOARD_SNAPSHOT
    ?? resolve(here, "../../legalos/scripts/census/leaderboard-snapshot.json");
  const allowlistPath = resolve(here, "../src/data/unscoredTrackedFirms.json");

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  const trackedNames = computeFirms(files.map((f) => readFileSync(join(migrationsDir, f), "utf8")));
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));

  const errors = reconcileCohort(trackedNames, snapshot, allowlist);
  if (errors.length > 0) {
    console.error("check-firm-cohort: tracked-firm directory and published audit pool have diverged:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const unscored = Object.keys(allowlist).filter((k) => k !== "_comment").length;
  console.log(
    `check-firm-cohort: OK — ${snapshot.firms.length} published audits reconcile with ${trackedNames.length} tracked firms (${unscored} explicitly unscored).`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
