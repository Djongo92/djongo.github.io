// The quarterly cadence gate is the only thing standing between a casual
// `census-batch --force` and a 91-firm paid re-measurement — pin its
// decision table so a refactor can't silently turn full sweeps back into
// an everyday (or multi-daily) event.
import { describe, it, expect } from "vitest";
// @ts-ignore — plain-JS module, no type declarations
import { cadenceGateDecision, FULL_SWEEP_CADENCE_DAYS } from "../scripts/census/cadence-gate.mjs";

const NOW = "2026-08-16T12:00:00.000Z";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("cadenceGateDecision", () => {
  it("allows the first sweep (no prior timestamp)", () => {
    expect(cadenceGateDecision(null, NOW)).toEqual({ allowed: true, daysSince: null });
  });

  it("refuses a full sweep one day after the last one, naming the next allowed date", () => {
    const d = cadenceGateDecision("2026-08-15T12:00:00.000Z", NOW);
    expect(d.allowed).toBe(false);
    expect(Math.floor(d.daysSince)).toBe(1);
    expect(d.nextAllowedIso).toBe("2026-11-13T12:00:00.000Z");
  });

  it("allows exactly at the cadence boundary", () => {
    const last = new Date(new Date(NOW).getTime() - FULL_SWEEP_CADENCE_DAYS * DAY_MS).toISOString();
    expect(cadenceGateDecision(last, NOW).allowed).toBe(true);
  });

  it("allows well past the cadence", () => {
    expect(cadenceGateDecision("2026-01-01T00:00:00.000Z", NOW).allowed).toBe(true);
  });

  it("fails open with a warn signal on unparseable timestamps rather than bricking the tool", () => {
    expect(cadenceGateDecision("garbage", NOW)).toEqual({ allowed: true, daysSince: null });
  });

  it("honors a custom cadence", () => {
    expect(cadenceGateDecision("2026-08-09T12:00:00.000Z", NOW, 7).allowed).toBe(true);
    expect(cadenceGateDecision("2026-08-10T12:00:00.000Z", NOW, 7).allowed).toBe(false);
  });
});
