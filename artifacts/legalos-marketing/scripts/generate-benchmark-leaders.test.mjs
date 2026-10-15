import test from "node:test";
import assert from "node:assert/strict";
import { computeDataPeriod, computeLeaderRows, computeScoreBuckets, renderBenchmarkLeadersTs, SCORE_BUCKETS } from "./generate-benchmark-leaders.mjs";

test("derives the quarter label from generatedAt and rejects a missing timestamp", () => {
  assert.equal(computeDataPeriod({ generatedAt: "2026-08-13T00:00:00.000Z" }), "Q3 2026");
  assert.equal(computeDataPeriod({ generatedAt: "2026-01-01T00:00:00.000Z" }), "Q1 2026");
  assert.equal(computeDataPeriod({ generatedAt: "2026-12-31T23:59:59.000Z" }), "Q4 2026");
  assert.equal(computeDataPeriod({ generatedAt: "2027-04-01T00:00:00.000Z" }), "Q2 2027");
  assert.throws(() => computeDataPeriod({}), /generatedAt/i);
  assert.throws(() => computeDataPeriod({ generatedAt: "not-a-date" }), /generatedAt/i);
});

test("emits the quarter label but never a raw ISO timestamp in the generated file", () => {
  const ts = renderBenchmarkLeadersTs({
    market: "serbia",
    generatedAt: "2026-08-13T00:00:00.000Z",
    leaders: [{ name: "X", totalScore: 100, peerGroup: "local" }],
    scores: [100],
  });
  assert.match(ts, /export const DATA_PERIOD = "Q3 2026";/);
  assert.doesNotMatch(ts, /2026-08-13/);
});

const snapshot = {
  market: "serbia",
  generatedAt: "2026-08-13T00:00:00.000Z",
  leaders: [
    { name: "BDK Advokati", totalScore: 153.61, peerGroup: "local" },
    { name: "JPM & Partners", totalScore: 153.44, peerGroup: "local" },
    { name: "Karanović & Partners", totalScore: 152.31, peerGroup: "regional" },
    { name: "Wolf Theiss (Law Office Miroslav Stojanović)", totalScore: 152.09, peerGroup: "international" },
    { name: "CWB", totalScore: 146.38, peerGroup: "consultancy" },
  ],
  // Raw census totals (display = ×2.5): 20 -> 50, 30 -> 75, 60 -> 150, 90 -> 225, 153.61 -> 384
  scores: [153.61, 90, 60, 30, 20],
};

test("converts raw totals to the public 0–500 display scale", () => {
  const rows = computeLeaderRows(snapshot);
  assert.equal(rows[0].score, 384); // 153.61 * 2.5 = 384.025
  assert.equal(rows[1].score, 384); // 153.44 * 2.5 = 383.6 -> 384
  assert.equal(rows[2].score, 381); // 152.31 * 2.5 = 380.775 -> 381
  assert.equal(rows[4].score, 366); // 146.38 * 2.5 = 365.95 -> 366
});

test("maps peer groups to display labels, unknown groups to a dash", () => {
  const rows = computeLeaderRows(snapshot);
  assert.deepEqual(rows.map((r) => r.category), ["Local", "Local", "Regional", "International", "Consultancy"]);
  const unknown = computeLeaderRows({ ...snapshot, leaders: [{ name: "X", totalScore: 1, peerGroup: "weird" }] });
  assert.equal(unknown[0].category, "—");
});

test("ranks sequentially in snapshot order and carries a dash delta", () => {
  const rows = computeLeaderRows(snapshot);
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3, 4, 5]);
  assert.ok(rows.every((r) => r.delta === "—"));
});

test("throws on a missing or empty snapshot rather than blanking the table", () => {
  assert.throws(() => computeLeaderRows(null), /snapshot/i);
  assert.throws(() => computeLeaderRows({ leaders: [] }), /snapshot/i);
});

test("buckets count display-scale scores, keep zero-count buckets, and cover all bands", () => {
  const buckets = computeScoreBuckets(snapshot);
  assert.deepEqual(buckets.map((b) => b.range), SCORE_BUCKETS.map((b) => b.label));
  // display: 50, 75, 150, 225, 384
  assert.deepEqual(buckets.map((b) => b.count), [1, 1, 1, 1, 0, 1]);
  // every score lands in exactly one bucket
  assert.equal(buckets.reduce((n, b) => n + b.count, 0), snapshot.scores.length);
});

test("bucket edges are inclusive on the display scale", () => {
  // 23.6 -> 59 (top of first bucket), 24 -> 60 (bottom of second), 124 -> 310 (leaders)
  const buckets = computeScoreBuckets({ ...snapshot, scores: [23.6, 24, 124] });
  assert.deepEqual(buckets.map((b) => b.count), [1, 1, 0, 0, 0, 1]);
});

test("throws on a snapshot without scores rather than rendering an empty chart", () => {
  assert.throws(() => computeScoreBuckets({ ...snapshot, scores: undefined }), /scores/i);
  assert.throws(() => computeScoreBuckets({ ...snapshot, scores: [] }), /scores/i);
  assert.throws(() => computeScoreBuckets({ ...snapshot, scores: [10, "x"] }), /non-numeric/i);
});

test("rendered TS carries the generated distribution and firm count", () => {
  const ts = renderBenchmarkLeadersTs(snapshot);
  assert.match(ts, /export const SCORED_FIRMS = 5;/);
  assert.match(ts, /export const SCORE_DISTRIBUTION: ScoreBucket\[\] = \[/);
  assert.match(ts, /\{ range: "0–59", count: 1 \},/);
  assert.match(ts, /\{ range: "310\+", count: 1 \},/);
});

test("rendered TS embeds the source attribution and JSON-serializes names", () => {
  const ts = renderBenchmarkLeadersTs({
    ...snapshot,
    leaders: [{ name: "O'Brien Law", totalScore: 100, peerGroup: "local" }],
  });
  assert.match(ts, /AUTO-GENERATED/);
  assert.match(ts, /leaderboard-snapshot\.json/);
  assert.match(ts, /"O'Brien Law"/); // JSON.stringify: apostrophe safe in double quotes
  assert.match(ts, /export const BENCHMARK_LEADERS/);
});

test("control characters in names cannot break the generated TS", () => {
  const ts = renderBenchmarkLeadersTs({
    ...snapshot,
    leaders: [{ name: "Evil\nName\"\tFirm", totalScore: 100, peerGroup: "local" }],
  });
  assert.match(ts, /"Evil\\nName\\"\\tFirm"/); // escaped, single-line
  const rowLines = ts.split("\n").filter((l) => l.includes("Evil"));
  assert.equal(rowLines.length, 1);
});

test("generated TS carries no volatile timestamp (git-diff stability)", () => {
  const ts = renderBenchmarkLeadersTs(snapshot);
  assert.ok(!ts.includes(snapshot.generatedAt));
  assert.ok(!ts.includes("generatedAt"));
});
