#!/usr/bin/env node
// Writes scripts/census/leaderboard-snapshot.json — the top public Serbia
// audits by total_score. The file is COMMITTED and consumed by the marketing
// site's scripts/generate-benchmark-leaders.mjs, so the landing leaderboard
// can never drift from measured scores without check:leaders failing.
//
// Pure read path: PostgREST with the publishable key — is_public rows are
// anon-readable (the live Visibility Index makes the same query from the
// browser), so no secret beyond the standard client env vars is needed.
//
// Called automatically at the end of run-census-audits.mjs (non-fatal there);
// can also run standalone: pnpm run census:snapshot
//
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../../../..");
export const SNAPSHOT_PATH = join(here, "leaderboard-snapshot.json");

/** How many leaders the marketing table shows. */
export const LEADERBOARD_SIZE = 7;

/**
 * Fetches ALL public audits for a market, deduped by domain (one row per
 * firm — keeps the highest-scoring row, which the ordering guarantees comes
 * first). Returns the top-N leaders for the landing table plus the raw
 * total_score of every deduped firm, which feeds the marketing histogram's
 * bucket counts (so the chart and the leaderboard can never diverge — they
 * come from the same fetch).
 */
export async function fetchLeaderboardRows(
  supabaseUrl,
  publishableKey,
  { market = "serbia", size = LEADERBOARD_SIZE } = {},
) {
  // Secondary order on audited_domain keeps rank/top-N membership stable
  // across tied total_scores (PostgREST tie order is otherwise unspecified).
  const url =
    `${supabaseUrl}/rest/v1/market_visibility_audits` +
    `?market=eq.${encodeURIComponent(market)}&is_public=eq.true` +
    `&select=display_name,audited_domain,total_score,peer_group` +
    `&order=total_score.desc,audited_domain.asc&limit=2000`;
  const resp = await fetch(url, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
  });
  if (!resp.ok) {
    throw new Error(`leaderboard snapshot query failed: HTTP ${resp.status} ${await resp.text().catch(() => "")}`);
  }
  const rows = await resp.json();
  const seen = new Set();
  const leaders = [];
  const scores = [];
  const firms = [];
  for (const r of rows) {
    const domain = String(r.audited_domain ?? "").toLowerCase().trim();
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    scores.push(Number(r.total_score));
    // Name + domain per scored firm: lets the marketing site's check:cohort
    // reconcile the published pool against the tracked-firm directory.
    firms.push({ name: String(r.display_name), domain });
    if (leaders.length < size) {
      leaders.push({
        name: r.display_name,
        totalScore: Number(r.total_score),
        peerGroup: r.peer_group ?? null,
      });
    }
  }
  // Fail explicitly rather than render a short table: the UI promises a
  // fixed-size leaderboard, and a short one reads as data loss, not as
  // "fewer firms passed the bar".
  if (leaders.length < size) {
    throw new Error(`leaderboard snapshot: only ${leaders.length} distinct domains found for market '${market}' (need ${size})`);
  }
  return { leaders, scores, firms };
}

export function buildSnapshot({ leaders, scores, firms }, market = "serbia", generatedAt = new Date().toISOString()) {
  return { market, generatedAt, scoredFirms: scores.length, leaders, scores, firms };
}

export function writeSnapshot(snapshot) {
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  return SNAPSHOT_PATH;
}

/**
 * Regenerates the marketing site's src/data/benchmarkLeaders.ts from the
 * snapshot. Part of the census completion path — a snapshot that never
 * reaches the generated TS leaves the landing serving the previous census.
 */
export function regenerateMarketingLeaders() {
  const gen = join(REPO_ROOT, "artifacts/legalos-marketing/scripts/generate-benchmark-leaders.mjs");
  execFileSync(process.execPath, [gen], { stdio: "inherit" });
}

/** Repo-relative paths the census leaderboard pipeline owns. */
export const LEADERBOARD_FILES = [
  "artifacts/legalos/scripts/census/leaderboard-snapshot.json",
  "artifacts/legalos-marketing/src/data/benchmarkLeaders.ts",
];

/**
 * Commits the snapshot + regenerated TS so the update persists beyond the
 * working tree. The runner executes in the user's workspace, so the commit
 * MUST be path-limited: `git commit --only -- <paths>` disregards anything
 * else already in the index — a plain `git commit` would sweep up unrelated
 * staged work. No-op when the sweep produced no score movement.
 */
export function commitLeaderboardFiles(repoRoot = REPO_ROOT) {
  const changed = execFileSync("git", ["status", "--porcelain", "--", ...LEADERBOARD_FILES], {
    cwd: repoRoot, encoding: "utf8",
  }).trim();
  if (!changed) {
    console.log("Leaderboard unchanged by this sweep — nothing to commit.");
    return false;
  }
  // Stage first so untracked pipeline files are committable, then commit
  // --only those paths: pre-existing staged entries stay staged, untouched.
  execFileSync("git", ["add", "--", ...LEADERBOARD_FILES], { cwd: repoRoot, stdio: "inherit" });
  execFileSync(
    "git",
    ["commit", "--only", "-m", "census: refresh leaderboard snapshot + generated marketing leaders", "--", ...LEADERBOARD_FILES],
    { cwd: repoRoot, stdio: "inherit" },
  );
  return true;
}

async function main() {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = process.env;
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY) {
    console.error("FATAL: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.");
    process.exit(1);
  }
  const board = await fetchLeaderboardRows(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY);
  const path = writeSnapshot(buildSnapshot(board));
  console.log(`Leaderboard snapshot written (${board.leaders.length} leaders, ${board.scores.length} scored firms) -> ${path}`);
  for (const l of board.leaders) console.log(`  ${l.totalScore}\t${l.name}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`FATAL: ${e?.message ?? e}`);
    process.exit(1);
  });
}
