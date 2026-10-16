// Cadence-alignment checks: verify that signal TTLs outlast the cron interval
// so the warm cache never expires between scheduled refreshes.
import { describe, it, expect } from "vitest";
import { CRON_INTERVAL_DAYS, PSI_TTL_HOURS, PLACES_TTL_HOURS } from "./config";

describe("firm-signals-refresh TTL / cron-cadence alignment", () => {
  it("PSI_TTL_HOURS exceeds the full cron interval", () => {
    expect(PSI_TTL_HOURS).toBeGreaterThan(CRON_INTERVAL_DAYS * 24);
  });

  it("PLACES_TTL_HOURS exceeds the full cron interval", () => {
    expect(PLACES_TTL_HOURS).toBeGreaterThan(CRON_INTERVAL_DAYS * 24);
  });

  it("PSI_TTL_HOURS carries at least a 1-day safety buffer over the cron interval", () => {
    expect(PSI_TTL_HOURS).toBeGreaterThanOrEqual((CRON_INTERVAL_DAYS + 1) * 24);
  });

  it("PLACES_TTL_HOURS carries at least a 3-day safety buffer over the cron interval", () => {
    expect(PLACES_TTL_HOURS).toBeGreaterThanOrEqual((CRON_INTERVAL_DAYS + 3) * 24);
  });

  it("PSI_TTL_HOURS value is 192 hours (8 days)", () => {
    expect(PSI_TTL_HOURS).toBe(192);
  });

  it("PLACES_TTL_HOURS value is 240 hours (10 days)", () => {
    expect(PLACES_TTL_HOURS).toBe(240);
  });

  it("CRON_INTERVAL_DAYS matches the pg_cron schedule (weekly = 7 days)", () => {
    // If this changes, update the cron.schedule() call in
    // 20260730000001_firm_signals_schedule.sql to match.
    expect(CRON_INTERVAL_DAYS).toBe(7);
  });
});
