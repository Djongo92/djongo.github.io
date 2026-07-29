import { describe, it, expect } from "vitest";
import { daysSince, isStale, AUDIT_STALE_AFTER_DAYS, DIRECTORY_STALE_AFTER_DAYS } from "./scoreFreshness";

const NOW = new Date("2026-07-29T00:00:00.000Z").getTime();

describe("daysSince", () => {
  it("returns null for a missing date", () => {
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince(undefined, NOW)).toBeNull();
  });

  it("returns null for an unparseable date", () => {
    expect(daysSince("not-a-date", NOW)).toBeNull();
  });

  it("computes whole days elapsed", () => {
    const thirtyDaysAgo = new Date(NOW - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysSince(thirtyDaysAgo, NOW)).toBe(30);
  });
});

describe("isStale", () => {
  it("is not stale exactly at the threshold", () => {
    const atThreshold = new Date(NOW - AUDIT_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(atThreshold, AUDIT_STALE_AFTER_DAYS, NOW)).toBe(false);
  });

  it("is stale one day past the threshold", () => {
    const pastThreshold = new Date(NOW - (AUDIT_STALE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(pastThreshold, AUDIT_STALE_AFTER_DAYS, NOW)).toBe(true);
  });

  it("a missing date is never flagged stale (nothing to compare against)", () => {
    expect(isStale(null, AUDIT_STALE_AFTER_DAYS, NOW)).toBe(false);
  });

  it("uses the longer directory threshold when asked", () => {
    const days100Ago = new Date(NOW - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(days100Ago, AUDIT_STALE_AFTER_DAYS, NOW)).toBe(true);
    expect(isStale(days100Ago, DIRECTORY_STALE_AFTER_DAYS, NOW)).toBe(false);
  });
});
