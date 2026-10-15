import { describe, it, expect } from "vitest";
import { isDemoEntryPath } from "./demoMode";

// This predicate gates a side effect that runs before React mounts and
// overwrites localStorage with demo fixtures, so its boundaries matter more
// than most: a false positive silently replaces a visitor's local state.
describe("isDemoEntryPath", () => {
  const BASE = "/app/";

  it("matches the demo entry URL", () => {
    expect(isDemoEntryPath("/app/demo", BASE)).toBe(true);
  });

  it("tolerates a trailing slash", () => {
    expect(isDemoEntryPath("/app/demo/", BASE)).toBe(true);
  });

  it("does not match the app root", () => {
    expect(isDemoEntryPath("/app/", BASE)).toBe(false);
    expect(isDemoEntryPath("/app", BASE)).toBe(false);
  });

  it("does not match other app routes", () => {
    expect(isDemoEntryPath("/app/teaser", BASE)).toBe(false);
    expect(isDemoEntryPath("/app/rankings", BASE)).toBe(false);
  });

  // The reason this is an exact comparison rather than a suffix test: a route
  // elsewhere on the origin ending in the same segment must not seed demo mode.
  it("does not match an unrelated path that merely ends in /demo", () => {
    expect(isDemoEntryPath("/demo", BASE)).toBe(false);
    expect(isDemoEntryPath("/app/workshop/demo", BASE)).toBe(false);
    expect(isDemoEntryPath("/marketing/demo", BASE)).toBe(false);
  });

  it("is not fooled by a similarly-named sibling segment", () => {
    expect(isDemoEntryPath("/app/demos", BASE)).toBe(false);
    expect(isDemoEntryPath("/app/demo-video", BASE)).toBe(false);
  });

  it("works when the app is served from the origin root", () => {
    expect(isDemoEntryPath("/demo", "/")).toBe(true);
    expect(isDemoEntryPath("/", "/")).toBe(false);
    expect(isDemoEntryPath("/app/demo", "/")).toBe(false);
  });

  it("works for a deploy path that lacks a trailing slash", () => {
    expect(isDemoEntryPath("/preview/demo", "/preview")).toBe(true);
    expect(isDemoEntryPath("/preview/other/demo", "/preview")).toBe(false);
  });
});
