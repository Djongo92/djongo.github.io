// The Battle Plan page's CTAs rely on this bus: launch before the lazy
// Progress section mounts (pending path) and launch while it's already
// mounted (event path) must both open the right tool — and only that tool.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  launchProgressTool,
  peekPendingProgressTool,
  clearPendingProgressTool,
  useAutoOpenTool,
} from "./progressToolLaunch";

describe("progressToolLaunch", () => {
  beforeEach(() => {
    clearPendingProgressTool();
  });

  it("launch while mounted opens the matching tool immediately", () => {
    const setOpen = vi.fn();
    renderHook(() => useAutoOpenTool("roast", setOpen));
    launchProgressTool("roast");
    expect(setOpen).toHaveBeenCalledWith(true);
    // The launch is consumed — a stale pending id must not linger.
    expect(peekPendingProgressTool()).toBeNull();
  });

  it("launch before mount is held as pending and consumed on mount", () => {
    launchProgressTool("roadmap");
    expect(peekPendingProgressTool()).toBe("roadmap");

    const setOpen = vi.fn();
    renderHook(() => useAutoOpenTool("roadmap", setOpen));
    expect(setOpen).toHaveBeenCalledWith(true);
    expect(peekPendingProgressTool()).toBeNull();
  });

  it("never opens a tool whose id didn't match", () => {
    const roastOpen = vi.fn();
    const competitorOpen = vi.fn();
    renderHook(() => useAutoOpenTool("roast", roastOpen));
    renderHook(() => useAutoOpenTool("competitor", competitorOpen));

    launchProgressTool("roast");
    expect(roastOpen).toHaveBeenCalledWith(true);
    expect(competitorOpen).not.toHaveBeenCalled();
  });

  it("a pending launch for a different tool does not open on mount", () => {
    launchProgressTool("competitor");
    const setOpen = vi.fn();
    renderHook(() => useAutoOpenTool("visibilityScore", setOpen));
    expect(setOpen).not.toHaveBeenCalled();
    // ...and the pending launch survives for its real owner.
    expect(peekPendingProgressTool()).toBe("competitor");
  });
});
