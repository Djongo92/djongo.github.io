import { describe, it, expect, beforeEach } from "vitest";
import {
  isEdgeFunctionAvailable,
  isEdgeFunctionKnownUndeployed,
  recordEdgeFunctionStatus,
  resetEdgeFunctionAvailability,
  KNOWN_UNDEPLOYED,
} from "./edgeFunctionAvailability";

describe("edgeFunctionAvailability", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEdgeFunctionAvailability();
  });

  it("KNOWN_UNDEPLOYED is currently empty — firm-profile and executive-report-schedule were deployed", () => {
    // Previously firm-profile and executive-report-schedule were in KNOWN_UNDEPLOYED
    // to suppress dead calls (they existed in the repo but were never deployed).
    // Both were deployed in the same release that removed them from this set.
    expect(KNOWN_UNDEPLOYED.has("firm-profile")).toBe(false);
    expect(KNOWN_UNDEPLOYED.has("executive-report-schedule")).toBe(false);
    expect(isEdgeFunctionAvailable("firm-profile")).toBe(true);
    expect(isEdgeFunctionAvailable("executive-report-schedule")).toBe(true);
    expect(isEdgeFunctionKnownUndeployed("firm-profile")).toBe(false);
  });

  it("treats any other function as available by default", () => {
    expect(isEdgeFunctionAvailable("visibility-audit-run")).toBe(true);
    expect(isEdgeFunctionKnownUndeployed("visibility-audit-run")).toBe(false);
  });

  it("learns from a runtime 404 and suppresses further calls until the TTL expires", () => {
    const now = 1_000_000;
    recordEdgeFunctionStatus("some-new-function", 404, now);
    expect(isEdgeFunctionAvailable("some-new-function", now + 1000)).toBe(false);
    // After the TTL, it becomes eligible again — self-heals after a deploy.
    expect(isEdgeFunctionAvailable("some-new-function", now + 25 * 60 * 60 * 1000)).toBe(true);
  });

  it("a non-404 response clears a previous 404 mark (the function exists)", () => {
    const now = 1_000_000;
    recordEdgeFunctionStatus("some-new-function", 404, now);
    expect(isEdgeFunctionAvailable("some-new-function", now + 1000)).toBe(false);
    recordEdgeFunctionStatus("some-new-function", 401, now + 2000);
    expect(isEdgeFunctionAvailable("some-new-function", now + 3000)).toBe(true);
  });

  it("a 200 response leaves the function available", () => {
    recordEdgeFunctionStatus("some-new-function", 200);
    expect(isEdgeFunctionAvailable("some-new-function")).toBe(true);
  });

  it("runtime marks never override the known-undeployed set", () => {
    // If a hypothetically-undeployed function received a recorded 200, the
    // static set still wins over any runtime mark — the 404 was observed live.
    // Use a synthetic name since the set is currently empty.
    const FAKE_UNDEPLOYED = "hypothetically-undeployed-fn";
    // Manually add to set to test the invariant (cast needed for test-only mutation).
    (KNOWN_UNDEPLOYED as Set<string>).add(FAKE_UNDEPLOYED);
    try {
      recordEdgeFunctionStatus(FAKE_UNDEPLOYED, 200);
      expect(isEdgeFunctionAvailable(FAKE_UNDEPLOYED)).toBe(false);
    } finally {
      (KNOWN_UNDEPLOYED as Set<string>).delete(FAKE_UNDEPLOYED);
    }
  });
});
