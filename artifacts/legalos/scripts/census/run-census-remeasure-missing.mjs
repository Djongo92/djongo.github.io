#!/usr/bin/env node
// One-off recovery driver for audits written while a paid provider was down.
// Discovery happens inside the secret-gated edge function so private
// interactive rows are included (public PostgREST reads cannot see them).
//
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, CENSUS_BATCH_SECRET
// Flags: --limit N, --dry-run, --reset
//
// The edge function owns the per-firm lease and client daily cap. This
// process is deliberately resumable: the server returns the candidate's
// before-provenance and the resulting after-provenance, and the local ledger
// is written after every candidate.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { recoveryReport } from "./censusLib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = join(here, ".census-remeasure-missing-progress.json");
const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, CENSUS_BATCH_SECRET } = process.env;
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY || !CENSUS_BATCH_SECRET) {
  console.error("FATAL: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and CENSUS_BATCH_SECRET are all required.");
  process.exit(1);
}
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const reset = args.includes("--reset");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity;
if (!Number.isFinite(limit) && limit !== Infinity) {
  console.error("FATAL: --limit must be a number.");
  process.exit(1);
}

const endpoint = `${VITE_SUPABASE_URL}/functions/v1/census-audit-remeasure-missing`;
const headers = {
  "Content-Type": "application/json",
  apikey: VITE_SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}`,
  "x-census-secret": CENSUS_BATCH_SECRET,
};
const ledger = !reset && existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, "utf8")) : {};
const discovery = await fetch(endpoint, { headers, signal: AbortSignal.timeout(30_000) });
const discovered = await discovery.json().catch(() => null);
if (discovery.status === 401 || discovery.status === 503) {
  console.error(`FATAL: ${discovered?.error ?? `HTTP ${discovery.status}`} — check the secret and function deploy.`);
  process.exit(1);
}
if (!discovery.ok) {
  console.error(`FATAL: discovery failed: ${discovered?.error ?? `HTTP ${discovery.status}`}`);
  process.exit(1);
}
const candidates = (discovered.candidates ?? []).filter((row) => ledger[row.id]?.status !== "done").slice(0, limit);
console.log(`Missing-category discovery: ${discovered.total ?? candidates.length} candidate row(s), ${candidates.length} pending in this pass.`);
if (dryRun) {
  for (const row of candidates) console.log(`would remeasure ${row.market}/${row.auditedDomain}: ${row.missing.join(", ")}`);
  process.exit(0);
}

const tally = { remeasured: 0, failed: 0, recoveredCategories: 0, stillMissingCategories: 0 };
for (const candidate of candidates) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ id: candidate.id }),
      signal: AbortSignal.timeout(150_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error ?? `HTTP ${response.status}`);
    const report = recoveryReport(result.beforeProvenance, result.afterProvenance);
    ledger[candidate.id] = {
      status: "done",
      domain: candidate.auditedDomain,
      market: candidate.market,
      report,
      at: new Date().toISOString(),
    };
    tally.remeasured++;
    tally.recoveredCategories += report.recovered.length;
    tally.stillMissingCategories += report.stillMissing.length;
    console.log(`${candidate.market}/${candidate.auditedDomain}: recovered ${report.recovered.length ? report.recovered.join(", ") : "none"}; still missing ${report.stillMissing.length ? report.stillMissing.join(", ") : "none"}`);
  } catch (error) {
    ledger[candidate.id] = { status: "failed", error: error?.message ?? String(error), at: new Date().toISOString() };
    tally.failed++;
    console.warn(`${candidate.market}/${candidate.auditedDomain}: failed — ${ledger[candidate.id].error}`);
  }
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
}
console.log(`Recovery pass complete: ${tally.remeasured} re-measured, ${tally.failed} failed, ${tally.recoveredCategories} categories recovered, ${tally.stillMissingCategories} still missing.`);
if (tally.failed > 0) process.exit(2);