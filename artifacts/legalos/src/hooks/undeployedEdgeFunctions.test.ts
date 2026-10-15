// Tests for the edge-function availability guard and hook behaviour.
//
// Historical context: firm-profile and executive-report-schedule were once
// in KNOWN_UNDEPLOYED (hooks never called them, UI said "unavailable"). Both
// were deployed in the same release that removed them from that set. These
// tests now verify the live-function path — hooks DO make network calls —
// and retain coverage for the runtime-404 fallback that applies to any
// future undeployed function.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { resetEdgeFunctionAvailability, KNOWN_UNDEPLOYED } from "@/lib/edgeFunctionAvailability";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    session: { access_token: "token-1" },
  }),
}));

vi.mock("@/hooks/useActiveWorkspace", () => ({
  useActiveWorkspace: () => ({ activeFirmId: "firm-1" }),
}));

import { useFirmProfile } from "./useFirmProfile";
import { useExecutiveReportSchedule } from "./useExecutiveReportSchedule";

const fetchSpy = vi.fn();

describe("edge function availability guard", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEdgeFunctionAvailability();
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("useFirmProfile attempts a fetch now that firm-profile is deployed", async () => {
    // Simulate the function responding (e.g. 401 for unauthenticated) — any
    // non-404 status means "function exists", so available stays true.
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    );

    const { result } = renderHook(() => useFirmProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("firm-profile"),
      expect.any(Object),
    );
    expect(result.current.available).toBe(true);
  });

  it("useFirmProfile.save makes a network call when the function is available", async () => {
    // Initial load + save both hit the network.
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ profile: { firm_id: "firm-1" } }), { status: 200 }),
    );

    const { result } = renderHook(() => useFirmProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.save({ website: "https://example.com" });
    // fetch was called at least once (load) and again for save
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("useExecutiveReportSchedule attempts a fetch now that the function is deployed", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ schedule: null, reports: [] }), { status: 200 }),
    );

    const { result } = renderHook(() => useExecutiveReportSchedule());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("executive-report-schedule"),
      expect.any(Object),
    );
    expect(result.current.available).toBe(true);
  });

  it("useExecutiveReportSchedule.setMonthlyEnabled makes a network call when the function is available", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ schedule: { enabled: true } }), { status: 200 }),
    );

    const { result } = renderHook(() => useExecutiveReportSchedule());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const toggleResult = await result.current.setMonthlyEnabled(true);
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect("ok" in toggleResult).toBe(true);
  });

  it("useExecutiveReportSchedule sends activeFirmId so a multi-firm caller cannot cross tenant boundaries", async () => {
    // Security regression: without activeFirmId in the payload, resolveClientId
    // would auto-select whichever of a consultant's firms had >1 member, letting
    // one firm's user silently read or toggle a different firm's schedule.
    // The hook must forward the workspace-switcher's active firm to the function.
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ schedule: null, reports: [] }), { status: 200 }),
    );

    const { result } = renderHook(() => useExecutiveReportSchedule());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The load call must include activeFirmId in the request body.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, initOptions] = fetchSpy.mock.calls[0];
    const body = JSON.parse(initOptions.body);
    expect(body).toHaveProperty("activeFirmId", "firm-1");

    // The toggle call must also include activeFirmId.
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ schedule: { enabled: true } }), { status: 200 }),
    );
    await result.current.setMonthlyEnabled(true);
    const [, toggleOptions] = fetchSpy.mock.calls[1];
    const toggleBody = JSON.parse(toggleOptions.body);
    expect(toggleBody).toHaveProperty("activeFirmId", "firm-1");
  });

  it("a runtime 404 from any function marks it unavailable for the rest of the day", async () => {
    const { recordEdgeFunctionStatus, isEdgeFunctionAvailable } = await import("@/lib/edgeFunctionAvailability");
    recordEdgeFunctionStatus("some-future-undeployed-fn", 404);
    expect(isEdgeFunctionAvailable("some-future-undeployed-fn")).toBe(false);
  });

  it("KNOWN_UNDEPLOYED guard still blocks a function placed in the set", async () => {
    // Regression guard: if a function is added back to KNOWN_UNDEPLOYED,
    // the hook must not call it.
    const FAKE = "hypothetically-blocked-fn";
    (KNOWN_UNDEPLOYED as Set<string>).add(FAKE);
    try {
      // useFirmProfile reads from the same module — use the availability helper directly.
      const { isEdgeFunctionAvailable, isEdgeFunctionKnownUndeployed } = await import("@/lib/edgeFunctionAvailability");
      expect(isEdgeFunctionAvailable(FAKE)).toBe(false);
      expect(isEdgeFunctionKnownUndeployed(FAKE)).toBe(true);
    } finally {
      (KNOWN_UNDEPLOYED as Set<string>).delete(FAKE);
    }
  });
});
