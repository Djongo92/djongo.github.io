import { describe, it, expect } from "vitest";
import { hasEntitlement } from "./entitlements";

// The seam this task adds: hasEntitlement is the single place gating will
// eventually plug into. Until then, it must grant everything, for every
// plan value and every feature, including when a firm couldn't be resolved
// at all — a lookup failure must not accidentally become the first form of
// gating.
describe("hasEntitlement", () => {
  it("grants access regardless of plan", () => {
    expect(hasEntitlement({ plan: "early_access" }, "benchmark")).toBe(true);
    expect(hasEntitlement({ plan: "full" }, "benchmark")).toBe(true);
    expect(hasEntitlement({ plan: "some_future_paid_tier" }, "benchmark")).toBe(true);
  });

  it("grants access when the firm has no plan set", () => {
    expect(hasEntitlement({ plan: null }, "benchmark")).toBe(true);
    expect(hasEntitlement({}, "benchmark")).toBe(true);
  });

  it("grants access when no firm could be resolved at all", () => {
    expect(hasEntitlement(null, "benchmark")).toBe(true);
    expect(hasEntitlement(undefined, "any")).toBe(true);
  });

  it("grants access regardless of which feature/scope is asked about", () => {
    expect(hasEntitlement({ plan: "early_access" }, "guidebook")).toBe(true);
    expect(hasEntitlement({ plan: "early_access" }, "workshop")).toBe(true);
    expect(hasEntitlement({ plan: "early_access" }, "anything-not-yet-defined")).toBe(true);
  });
});
