#!/usr/bin/env node
// Ingests the Serbia census CSV and produces the two artifacts the batch run
// needs:
//   1. supabase/migrations/<ts>_serbia_census_expansion.sql — directory rows
//      for new firms + domain backfills for matched seed firms.
//   2. scripts/census/census-manifest.json — one audit entry per firm with a
//      domain (census + already-directory firms), consumed by
//      scripts/census/run-census-audits.mjs.
//
// The existing directory state is replayed from migration SQL (the same
// source of truth generate:firms uses) — no live DB access needed.
//
// Usage: pnpm --filter @workspace/legalos run census:ingest -- <census.csv> [--dry-run]
// Review the printed classification table before committing the migration —
// peer-group derivation for firms the seed set doesn't type is a heuristic
// (see censusLib.classifyFirm).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCensusCsv, buildDirectoryState, planIngest, renderMigration } from "./censusLib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const artifactRoot = join(here, "..", "..");

const csvPath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!csvPath) {
  console.error("usage: tsx scripts/census/ingest-census.mjs <census.csv> [--dry-run]");
  process.exit(1);
}

const census = parseCensusCsv(readFileSync(csvPath, "utf8"));
for (const w of census.warnings) console.warn(`WARNING: ${w}`);
console.log(`census rows parsed: ${census.rows.length}`);

const migrationsDir = join(artifactRoot, "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ name: f, sql: readFileSync(join(migrationsDir, f), "utf8") }));
const directory = buildDirectoryState(migrationFiles);
console.log(`existing directory firms replayed from migrations: ${directory.length}`);

const plan = planIngest(census.rows, directory);
for (const w of plan.warnings) console.warn(`WARNING: ${w}`);

console.log("\n--- matches against existing directory (verify these!) ---");
for (const m of plan.matches) console.log(`  [${m.by}] census "${m.censusName}" → directory "${m.matchedTo}"`);
console.log(`\nnew firms to insert: ${plan.inserts.length}`);
for (const r of plan.inserts) console.log(`  + ${r.firmName} [${r.firmType}] ${r.firmDomain ?? "(no domain)"}`);
console.log(`\ndomain backfills for existing firms: ${plan.enriches.length}`);
for (const e of plan.enriches) console.log(`  ~ ${e.firmName} → ${e.firmDomain}`);
console.log(`\nskipped census rows: ${plan.skipped.length}`);
for (const s of plan.skipped) console.log(`  - ${s.name}: ${s.reason}`);
console.log(`\naudit manifest entries: ${plan.manifest.length}`);
const byGroup = {};
for (const m of plan.manifest) byGroup[m.peerGroup] = (byGroup[m.peerGroup] ?? 0) + 1;
for (const [group, count] of Object.entries(byGroup)) console.log(`  ${group}: ${count}`);

if (dryRun) {
  console.log("\n--dry-run: no files written.");
  process.exit(0);
}

const now = new Date();
const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
if (plan.inserts.length > 0 || plan.enriches.length > 0) {
  const migrationPath = join(migrationsDir, `${ts}_serbia_census_expansion.sql`);
  writeFileSync(migrationPath, renderMigration(plan));
  console.log(`\nwrote migration: supabase/migrations/${ts}_serbia_census_expansion.sql`);
} else {
  console.log("\nno directory changes — no migration written.");
}

const manifestPath = join(here, "census-manifest.json");
writeFileSync(
  manifestPath,
  JSON.stringify({ generatedAt: now.toISOString(), market: "serbia", firms: plan.manifest, skipped: plan.skipped }, null, 2) + "\n",
);
console.log(`wrote manifest: scripts/census/census-manifest.json`);
console.log("\nNext: review the classification table above, apply the migration (Management API + ledger per check:schema-drift),");
console.log("deploy census-audit-run + the changed _shared modules, then run the batch with census:run.");
