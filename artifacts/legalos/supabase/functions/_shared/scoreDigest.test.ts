// Task #165 — the digest's value is saying something TRUE about movement:
// weekly baseline (not same-week jitter), silence below the noise floor,
// one notification per firm.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { computeDigestMovements, digestNotification, DIGEST_MIN_DELTA, type HistoryPoint } from "./scoreDigest";

const NOW = new Date("2026-08-11T07:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 864e5).toISOString();

const point = (over: Partial<HistoryPoint>): HistoryPoint => ({
  client_id: "c1",
  audited_domain: "alfa.rs",
  market: "serbia",
  total_score: 40,
  performance_score: 8,
  social_score: 4,
  seo_authority_score: 12,
  thought_leadership_score: 6,
  reputation_score: 10,
  recorded_at: daysAgo(8),
  ...over,
});

describe("computeDigestMovements (task #165)", () => {
  it("detects a real week-over-week move and names the biggest category driver", () => {
    const rows = [
      point({ total_score: 40, thought_leadership_score: 6 }),
      point({ total_score: 48, thought_leadership_score: 13, recorded_at: daysAgo(1) }),
    ];
    const [m] = computeDigestMovements(rows, NOW);
    expect(m).toMatchObject({ clientId: "c1", domain: "alfa.rs", from: 40, to: 48, delta: 8, driver: "Thought leadership" });
  });

  it("stays silent below the noise floor", () => {
    const rows = [
      point({ total_score: 40 }),
      point({ total_score: 40 + DIGEST_MIN_DELTA - 1, recorded_at: daysAgo(1) }),
    ];
    expect(computeDigestMovements(rows, NOW)).toEqual([]);
  });

  it("ignores same-week jitter — a baseline younger than ~6 days is no weekly story", () => {
    const rows = [
      point({ total_score: 40, recorded_at: daysAgo(3) }),
      point({ total_score: 55, recorded_at: daysAgo(1) }),
    ];
    expect(computeDigestMovements(rows, NOW)).toEqual([]);
  });

  it("sends one notification per client — the largest mover wins", () => {
    const rows = [
      point({ total_score: 40 }),
      point({ total_score: 44, recorded_at: daysAgo(1) }), // +4 on alfa.rs
      point({ audited_domain: "beta.rs", total_score: 50 }),
      point({ audited_domain: "beta.rs", total_score: 61, seo_authority_score: 22, recorded_at: daysAgo(2) }), // +11
    ];
    const moves = computeDigestMovements(rows, NOW);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ domain: "beta.rs", delta: 11, driver: "Search authority" });
  });

  it("never compares readings scored under different methodology versions", () => {
    const rows = [
      point({ total_score: 80, methodology_version: 2 }),
      point({ total_score: 200, methodology_version: 3, recorded_at: daysAgo(1) }),
    ];
    expect(computeDigestMovements(rows, NOW)).toEqual([]);
  });

  it("different clients each get their own digest", () => {
    const rows = [
      point({ total_score: 40 }),
      point({ total_score: 46, recorded_at: daysAgo(1) }),
      point({ client_id: "c2", audited_domain: "gamma.rs", total_score: 60 }),
      point({ client_id: "c2", audited_domain: "gamma.rs", total_score: 55, recorded_at: daysAgo(1) }),
    ];
    const moves = computeDigestMovements(rows, NOW);
    expect(moves.map((m) => [m.clientId, m.delta].join(":")).sort()).toEqual(["c1:6", "c2:-5"]);
  });
});

describe("digestNotification copy", () => {
  it("says the direction, the numbers, and the driver", () => {
    const n = digestNotification({ clientId: "c1", domain: "alfa.rs", market: "serbia", from: 40, to: 48, delta: 8, driver: "Thought leadership", latestRecordedAt: daysAgo(1) });
    expect(n.title).toBe("Your visibility score went up this week");
    expect(n.body).toContain("40 → 48 of 500");
    expect(n.body).toContain("alfa.rs");
    expect(n.body).toContain("Thought leadership");
  });
});

// Code review on task #165: exactly-once delivery rests on two durable pins
// — movements must carry their latest-audit timestamp (the idempotency key),
// and the migration + function must agree on the score_digest_log claim.
describe("digest idempotency pins (task #165 review)", () => {
  it("every movement carries the latest-audit timestamp as its idempotency key", () => {
    const rows = [
      point({ total_score: 40 }),
      point({ total_score: 48, recorded_at: daysAgo(1) }),
    ];
    const [m] = computeDigestMovements(rows, NOW);
    expect(m.latestRecordedAt).toBe(daysAgo(1));
  });

  it("an unchanged reading set never re-sends: retries hit the same key, next Monday finds no movement", () => {
    const rows = [
      point({ total_score: 40 }),
      point({ total_score: 48, recorded_at: daysAgo(1) }),
    ];
    // Same week, later run (cron retry): the idempotency key is identical,
    // so the score_digest_log upsert absorbs the duplicate.
    const first = computeDigestMovements(rows, NOW);
    const retry = computeDigestMovements(rows, new Date(NOW.getTime() + 2 * 864e5));
    expect(retry.map((m) => `${m.clientId}:${m.latestRecordedAt}`)).toEqual(
      first.map((m) => `${m.clientId}:${m.latestRecordedAt}`),
    );
    // Next Monday with no new audit: the old "latest" is now the baseline —
    // nothing qualifies at all, so no notification is even attempted.
    const nextMonday = computeDigestMovements(rows, new Date(NOW.getTime() + 7 * 864e5));
    expect(nextMonday).toEqual([]);
  });

  it("the migration and the function agree on the atomic claim RPC", () => {
    const migration = readFileSync(join(__dirname, "../../migrations/20260812000000_weekly_score_digest.sql"), "utf8");
    expect(migration).toContain("CREATE TABLE public.score_digest_log");
    expect(migration).toContain("PRIMARY KEY (client_id, latest_recorded_at)");
    // One RPC = one transaction: claim + notification succeed or roll back
    // together (a lost digest is worse than a retryable failure).
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.claim_score_digest");
    const fn = readFileSync(join(__dirname, "../weekly-score-digest/index.ts"), "utf8");
    expect(fn).toContain('rpc("claim_score_digest"');
    // The old two-step pattern (claim upsert + separate notification insert)
    // must not come back — it can orphan a claim on notification failure.
    expect(fn).not.toContain('from("score_digest_log")');
    expect(fn).not.toContain('from("notifications")');
  });
});
