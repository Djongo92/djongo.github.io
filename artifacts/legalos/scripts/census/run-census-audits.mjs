#!/usr/bin/env node
// Drives the census batch: one HTTP call per manifest firm to the
// secret-guarded census-audit-run edge function, sequentially (audits are
// already parallel internally; serializing keeps provider/PSI load sane and
// makes progress trivially resumable).
//
// Prereqs (one-time):
//   1. census:ingest produced scripts/census/census-manifest.json
//   2. the directory-expansion migration is applied
//   3. census-audit-run + the changed _shared modules are DEPLOYED
//      (CLI `--use-api` per the project's deploy path), with
//      CENSUS_BATCH_SECRET set in the Supabase project secrets
//
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, CENSUS_BATCH_SECRET
// Flags: --limit N (first N pending firms), --force (re-audit completed),
//        --only <file> (restrict to domains listed one-per-line; uses its own
//        progress file so targeted refresh passes stay resumable without
//        touching the full-census progress ledger),
//        --dry-run (print what would run),
//        --override-cadence (deliberate, paid full re-measurement ahead of
//        the quarterly cadence — see cadence-gate.mjs)
//
// Resumable: progress lands in scripts/census/.census-progress.json after
// every firm. The edge function itself is idempotent per domain, so a
// client-side timeout ("unknown") resolves to the completed audit on the
// next run instead of paying for a duplicate.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { fetchLeaderboardRows, buildSnapshot, writeSnapshot, regenerateMarketingLeaders, commitLeaderboardFiles } from "./export-leaderboard-snapshot.mjs";
import { cadenceGateDecision, FULL_SWEEP_CADENCE_DAYS } from "./cadence-gate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(here, "census-manifest.json");
const PROGRESS_PATH = join(here, ".census-progress.json");
// Written only when a non---only run leaves the WHOLE manifest done — the
// cadence gate keys on this, never on per-row updated_at (a targeted --only
// refresh bumps those and must not stall the next quarterly sweep).
const MARKER_PATH = join(here, ".census-last-full-sweep.json");

const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, CENSUS_BATCH_SECRET } = process.env;
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY || !CENSUS_BATCH_SECRET) {
  console.error("FATAL: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and CENSUS_BATCH_SECRET are all required.");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const overrideCadence = args.includes("--override-cadence");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const onlyIdx = args.indexOf("--only");
const onlyPath = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

if (!existsSync(MANIFEST_PATH)) {
  console.error("FATAL: scripts/census/census-manifest.json not found — run census:ingest first.");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
// --only runs get their own progress ledger (keyed by a hash of the domain
// list CONTENTS, not its basename — two different lists sharing a basename
// must not share state, per code review): the main ledger already marks
// every census firm "done", which would otherwise make a targeted --force
// refresh pass skip everything. To reset a pass, delete the printed ledger.
const onlyDomains = onlyPath
  ? new Set(readFileSync(onlyPath, "utf8").split("\n").map((s) => s.trim().toLowerCase()).filter(Boolean))
  : null;
const progressPath = onlyPath
  ? join(here, `.census-progress-only-${createHash("sha256").update([...onlyDomains].sort().join("\n")).digest("hex").slice(0, 10)}.json`)
  : PROGRESS_PATH;
if (onlyPath) console.log(`--only: ${onlyDomains.size} domains · ledger: ${progressPath}`);
const progress = existsSync(progressPath) ? JSON.parse(readFileSync(progressPath, "utf8")) : {};

const ENDPOINT = `${VITE_SUPABASE_URL}/functions/v1/census-audit-run`;
const REQUEST_TIMEOUT_MS = 12 * 60 * 1000; // a full audit can take minutes (PageSpeed) — see seed-smoke-audit.mjs
const BETWEEN_FIRMS_MS = 2000;

const pending = manifest.firms
  .filter((f) => !onlyDomains || onlyDomains.has(f.domain))
  // Under --only the dedicated ledger is authoritative even with --force:
  // a restarted pass must resume, not restart from the top.
  .filter((f) => onlyDomains ? progress[f.domain]?.status !== "done" : force || progress[f.domain]?.status !== "done")
  .slice(0, limit);
console.log(`manifest: ${manifest.firms.length} firms · already done: ${manifest.firms.length - pending.length} · this run: ${pending.length}`);
if (dryRun) {
  for (const f of pending) console.log(`  would audit: ${f.domain} (${f.displayName}) [${f.peerGroup}${f.firmSize ? ` / ${f.firmSize}` : ""}]`);
  process.exit(0);
}

// Cadence gate: a full --force sweep re-measures every manifest firm and
// spends paid provider budget (PSI / DataForSEO / Gemini) on each, so full
// sweeps run at most once per quarter. --only refreshes are exempt (own
// ledger, few firms); --override-cadence is the deliberate escape hatch.
if (force && !onlyPath && !overrideCadence) {
  const marker = existsSync(MARKER_PATH) ? JSON.parse(readFileSync(MARKER_PATH, "utf8")) : null;
  const lastLedgerSweep = Object.values(progress)
    .filter((p) => p?.status === "done" && typeof p?.at === "string")
    .map((p) => p.at)
    .sort()
    .at(-1) ?? null;
  const lastSweepMs = [marker?.completedAt, lastLedgerSweep]
    .filter(Boolean)
    .map((s) => new Date(s).getTime())
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), -Infinity);
  const gate = cadenceGateDecision(
    lastSweepMs === -Infinity ? null : new Date(lastSweepMs).toISOString(),
    new Date().toISOString(),
  );
  if (!gate.allowed) {
    console.error(
      `Refused: the last full sweep measured every firm ${Math.floor(gate.daysSince)} day(s) ago; ` +
      `the cadence is ${FULL_SWEEP_CADENCE_DAYS} days (next full sweep ~${gate.nextAllowedIso.slice(0, 10)}). ` +
      `Use --only <file> for targeted refreshes, or --override-cadence for a deliberate paid re-measurement.`,
    );
    process.exit(1);
  }
  if (gate.daysSince === null) {
    console.warn("cadence gate: no prior sweep timestamp found — allowing, but check the ledger/DB if this isn't the first run.");
  }
}

let done = 0;
let failed = 0;
const startedAt = Date.now();

for (const firm of pending) {
  const firmStart = Date.now();
  const body = JSON.stringify({
    auditedDomain: firm.domain,
    displayName: firm.displayName,
    peerGroup: firm.peerGroup,
    firmSize: firm.firmSize ?? undefined,
    force,
  });
  let outcome = null;
  for (let attempt = 1; attempt <= 3 && !outcome; attempt++) {
    try {
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "x-census-secret": CENSUS_BATCH_SECRET,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const parsed = await resp.json().catch(() => null);
      if (resp.status === 401 || resp.status === 503) {
        console.error(`FATAL: ${parsed?.error ?? `HTTP ${resp.status}`} — check CENSUS_BATCH_SECRET and the function deploy. Aborting the whole batch.`);
        process.exit(1);
      }
      if (!resp.ok) {
        if (attempt === 3) {
          progress[firm.domain] = { status: "failed", error: parsed?.error ?? `HTTP ${resp.status}`, at: new Date().toISOString() };
          break;
        }
        await new Promise((r) => setTimeout(r, 5000 * attempt));
        continue;
      }
      outcome = parsed;
    } catch (e) {
      // Timeout/network: the audit may still complete server-side. Mark
      // unknown — the next run's idempotent reuse resolves it without
      // paying for a duplicate audit.
      progress[firm.domain] = { status: "unknown", error: e?.message ?? String(e), at: new Date().toISOString() };
      break;
    }
  }

  if (outcome) {
    progress[firm.domain] = {
      status: "done",
      totalScore: outcome.totalScore,
      reused: outcome.reused === true,
      seconds: Math.round((Date.now() - firmStart) / 1000),
      at: new Date().toISOString(),
    };
    done++;
    console.log(`[${done + failed}/${pending.length}] ${firm.domain}: score ${outcome.totalScore}${outcome.reused ? " (reused existing)" : ""} in ${progress[firm.domain].seconds}s`);
  } else {
    failed++;
    console.warn(`[${done + failed}/${pending.length}] ${firm.domain}: ${progress[firm.domain].status} — ${progress[firm.domain].error}`);
  }
  writeFileSync(progressPath, JSON.stringify(progress, null, 2) + "\n");
  await new Promise((r) => setTimeout(r, BETWEEN_FIRMS_MS));
}

const tally = { done: 0, failed: 0, unknown: 0 };
for (const f of manifest.firms) {
  const s = progress[f.domain]?.status;
  if (s && tally[s] !== undefined) tally[s]++;
}
console.log(`\nBatch pass complete in ${Math.round((Date.now() - startedAt) / 60000)}min. Manifest-wide: ${tally.done} done, ${tally.failed} failed, ${tally.unknown} unknown (re-run resolves unknowns idempotently).`);

// Record full-market completion for the cadence gate — only when THIS run
// was an unbounded full re-measurement (--force, no --only, no --limit) that
// left the whole manifest done. A no-op run over an already-done ledger, a
// straggler fill-in, or a capped --limit pass must never reset the clock.
if (force && !onlyPath && limit === Infinity && manifest.firms.every((f) => progress[f.domain]?.status === "done")) {
  writeFileSync(MARKER_PATH, JSON.stringify({ completedAt: new Date().toISOString(), firms: manifest.firms.length }, null, 2) + "\n");
  console.log(`Full-sweep marker written: ${MARKER_PATH}`);
}

// Propagate this pass's scores to the marketing leaderboard in ONE
// automated path: snapshot -> regenerate benchmarkLeaders.ts -> commit both
// files. Any failure is LOUD (distinct exit 3): the audits are safely in the
// DB, but if propagation silently stopped halfway the landing would serve
// the previous census's scores with check:leaders still green — exactly the
// drift class this pipeline exists to kill. (Publishing the site remains the
// user's explicit action, same as for any committed change; the dev preview
// updates immediately via HMR.)
try {
  const board = await fetchLeaderboardRows(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY);
  writeSnapshot(buildSnapshot(board));
  console.log(`Leaderboard snapshot refreshed (${board.leaders.length} leaders, ${board.scores.length} scored firms).`);
  regenerateMarketingLeaders();
  commitLeaderboardFiles();
} catch (e) {
  console.error(`FATAL: leaderboard propagation failed: ${e?.message ?? e}`);
  process.exit(3);
}
if (tally.failed > 0) process.exit(2);
