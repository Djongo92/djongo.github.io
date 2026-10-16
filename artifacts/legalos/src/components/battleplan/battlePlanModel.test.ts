import { describe, it, expect } from "vitest";
import {
  buildSteps,
  planTotals,
  earnedBadgeIds,
  hasAnyInput,
  isStale,
  timeAgo,
  STALE_AFTER_MS,
  type BattlePlanSlots,
} from "./battlePlanModel";
import type { RoastCache } from "@/hooks/useBattlePlanCache";

const EMPTY: BattlePlanSlots = {
  roast: null,
  competitor: null,
  roadmap: null,
  maturity: null,
  headline: null,
  bio: null,
  visibilityScore: null,
};

// The model only cares about presence and capturedAt, so a minimal object
// satisfies the slot contract.
const slot = (capturedAt = Date.now()) => ({ capturedAt }) as unknown as RoastCache;

describe("battlePlanModel", () => {
  it("builds 7 steps: 3 core, 4 bonus, all undone when empty", () => {
    const steps = buildSteps(EMPTY);
    expect(steps).toHaveLength(7);
    expect(steps.filter((s) => s.core)).toHaveLength(3);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(hasAnyInput(EMPTY)).toBe(false);
  });

  it("marks filled slots done and exposes capturedAt", () => {
    const now = Date.now();
    const steps = buildSteps({ ...EMPTY, roast: slot(now) });
    const roast = steps.find((s) => s.key === "roast");
    expect(roast?.done).toBe(true);
    expect(roast?.capturedAt).toBe(now);
    expect(hasAnyInput({ ...EMPTY, roast: slot() })).toBe(true);
  });

  it("counts totals and core separately", () => {
    const steps = buildSteps({ ...EMPTY, roast: slot(), competitor: slot(), roadmap: slot(), bio: slot() });
    expect(planTotals(steps)).toEqual({ done: 4, total: 7, coreDone: 3, coreTotal: 3 });
  });

  it("awards Battle Ready for exactly the 3 core inputs", () => {
    expect(earnedBadgeIds({ ...EMPTY, roast: slot(), competitor: slot(), roadmap: slot() })).toEqual(new Set(["battle-ready"]));
    // Two of three is not enough.
    expect(earnedBadgeIds({ ...EMPTY, roast: slot(), competitor: slot() }).has("battle-ready")).toBe(false);
  });

  it("awards Foundation Builder and Voice Found for their combos", () => {
    expect(earnedBadgeIds({ ...EMPTY, visibilityScore: slot(), maturity: slot() })).toEqual(new Set(["foundation-builder"]));
    expect(earnedBadgeIds({ ...EMPTY, bio: slot(), headline: slot() })).toEqual(new Set(["voice-found"]));
  });

  it("awards Fully Armed only when every section is filled", () => {
    const full: BattlePlanSlots = {
      roast: slot(), competitor: slot(), roadmap: slot(), maturity: slot(),
      headline: slot(), bio: slot(), visibilityScore: slot(),
    };
    const earned = earnedBadgeIds(full);
    expect(earned.has("fully-armed")).toBe(true);
    // ...and every other badge comes with it.
    expect(earned.size).toBe(4);
    expect(earnedBadgeIds({ ...full, bio: null }).has("fully-armed")).toBe(false);
  });

  it("treats old intel as stale but never missing intel", () => {
    const now = Date.now();
    expect(isStale(undefined, now)).toBe(false);
    expect(isStale(now - STALE_AFTER_MS - 1, now)).toBe(true);
    expect(isStale(now - STALE_AFTER_MS + 1, now)).toBe(false);
  });

  it("formats ages coarsely", () => {
    const now = Date.now();
    expect(timeAgo(now - 5 * 60000, now)).toBe("5m ago");
    expect(timeAgo(now - 3 * 3600000, now)).toBe("3h ago");
    expect(timeAgo(now - 4 * 86400000, now)).toBe("4d ago");
    // A future timestamp (clock skew) reads as 0m, never negative.
    expect(timeAgo(now + 60000, now)).toBe("0m ago");
  });
});
