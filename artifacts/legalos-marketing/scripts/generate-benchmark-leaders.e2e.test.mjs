// End-to-end pipeline test: a changed census score must reach the generated
// landing-page data through the REAL CLI with no manual transform. Drives
// generate-benchmark-leaders.mjs as a subprocess against a temp snapshot via
// the documented LEGALOS_LEADERBOARD_SNAPSHOT / LEGALOS_LEADERS_OUT overrides.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { commitLeaderboardFiles, LEADERBOARD_FILES } from "../../legalos/scripts/census/export-leaderboard-snapshot.mjs";

const CLI = fileURLToPath(new URL("./generate-benchmark-leaders.mjs", import.meta.url));

function runCli(snapshot) {
  const dir = mkdtempSync(join(tmpdir(), "leaders-e2e-"));
  const snap = join(dir, "snapshot.json");
  const out = join(dir, "benchmarkLeaders.ts");
  writeFileSync(snap, JSON.stringify(snapshot));
  execFileSync(process.execPath, [CLI], {
    env: { ...process.env, LEGALOS_LEADERBOARD_SNAPSHOT: snap, LEGALOS_LEADERS_OUT: out },
  });
  return readFileSync(out, "utf8");
}

const snap = (score, extraScores = []) => ({
  market: "serbia",
  leaders: [{ name: "Acme Law", totalScore: score, peerGroup: "local" }],
  scores: [score, ...extraScores],
});

test("a changed census score changes the generated landing data", () => {
  const before = runCli({ ...snap(153.61), generatedAt: "2026-08-01T00:00:00.000Z" });
  const after = runCli({ ...snap(160.0), generatedAt: "2026-09-15T00:00:00.000Z" });
  assert.match(before, /score: 384/);
  assert.match(after, /score: 400/);
  assert.notEqual(before, after);
});

test("a changed distribution (same leaders) changes the generated landing data", () => {
  const before = runCli({ ...snap(153.61, [20]), generatedAt: "2026-08-01T00:00:00.000Z" });
  const after = runCli({ ...snap(153.61, [90]), generatedAt: "2026-09-15T00:00:00.000Z" });
  assert.match(before, /\{ range: "0–59", count: 1 \}/);
  assert.match(after, /\{ range: "185–249", count: 1 \}/);
  assert.notEqual(before, after);
});

test("identical scores regenerate byte-identical output (no timestamp churn)", () => {
  const a = runCli({ ...snap(153.61), generatedAt: "2026-08-01T00:00:00.000Z" });
  const b = runCli({ ...snap(153.61), generatedAt: "2026-09-15T00:00:00.000Z" });
  assert.equal(a, b);
});

test("the census runner wires the propagation path (snapshot -> regen -> commit)", () => {
  // Static guard: if the runner hook is removed, the stale-leaderboard
  // failure mode returns silently — fail loudly here instead.
  const runner = readFileSync(
    fileURLToPath(new URL("../../legalos/scripts/census/run-census-audits.mjs", import.meta.url)),
    "utf8",
  );
  assert.match(runner, /regenerateMarketingLeaders\(\)/);
  assert.match(runner, /commitLeaderboardFiles\(\)/);
});

/** Builds a temp git repo with the two pipeline files committed. */
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "leaders-git-"));
  const git = (args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git(["init", "-q"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "test"]);
  for (const rel of LEADERBOARD_FILES) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), "v1");
  }
  git(["add", "."]);
  git(["commit", "-q", "-m", "init"]);
  return { dir, git };
}

test("the census commit is path-limited: unrelated staged work is NOT swept in", () => {
  const { dir, git } = makeRepo();
  for (const rel of LEADERBOARD_FILES) writeFileSync(join(dir, rel), "v2"); // pipeline changes
  writeFileSync(join(dir, "unrelated.txt"), "someone's staged work");
  git(["add", "unrelated.txt"]); // pre-existing staged entry

  assert.equal(commitLeaderboardFiles(dir), true);

  const committed = git(["show", "--name-only", "--pretty=format:", "HEAD"]).trim().split("\n").sort();
  assert.deepEqual(committed, [...LEADERBOARD_FILES].sort());
  // The unrelated file stays staged, uncommitted, exactly as the user left it.
  assert.equal(git(["diff", "--cached", "--name-only"]).trim(), "unrelated.txt");
});

test("the census commit is a no-op when scores did not move", () => {
  const { dir, git } = makeRepo();
  const headBefore = git(["rev-parse", "HEAD"]).trim();
  assert.equal(commitLeaderboardFiles(dir), false);
  assert.equal(git(["rev-parse", "HEAD"]).trim(), headBefore);
});
