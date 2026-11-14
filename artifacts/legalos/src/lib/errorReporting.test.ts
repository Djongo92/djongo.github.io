import { describe, expect, it, vi } from "vitest";
import { MAX_REPORTS_PER_PAGE, createReporter, describeError, shouldIgnore } from "./errorReporting";
import { RELOAD_WINDOW_MS, claimReload } from "./lazyWithReload";

describe("shouldIgnore", () => {
  it("drops browser noise and extension errors", () => {
    expect(shouldIgnore("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(shouldIgnore("Script error.")).toBe(true);
    expect(shouldIgnore("AbortError: The user aborted a request.")).toBe(true);
    expect(shouldIgnore("TypeError: x", "at f (chrome-extension://abc/content.js:1:1)")).toBe(true);
    expect(shouldIgnore("  ")).toBe(true);
  });

  it("keeps real errors", () => {
    expect(shouldIgnore("TypeError: Cannot read properties of undefined", "at f (https://site/app/a.js:1:1)"))
      .toBe(false);
  });
});

describe("describeError", () => {
  it("handles errors, strings and objects", () => {
    expect(describeError(new TypeError("bad")).message).toBe("TypeError: bad");
    expect(describeError("plain")).toEqual({ message: "plain" });
    expect(describeError({ code: 1 })).toEqual({ message: '{"code":1}' });
    expect(describeError(undefined).message).toBe("undefined");
  });
});

describe("createReporter", () => {
  it("does nothing when disabled", () => {
    const send = vi.fn();
    createReporter(send, false)(new Error("x"), "error");
    expect(send).not.toHaveBeenCalled();
  });

  it("dedupes and stops at the per-page budget", () => {
    const send = vi.fn();
    const report = createReporter(send, true);
    report(new Error("same"), "error");
    report(new Error("same"), "error");
    expect(send).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 20; i++) report(new Error(`e${i}`), "error");
    expect(send).toHaveBeenCalledTimes(MAX_REPORTS_PER_PAGE);
  });

  it("never throws when sending fails", () => {
    const report = createReporter(() => {
      throw new Error("network");
    }, true);
    expect(() => report(new Error("x"), "boundary")).not.toThrow();
  });

  it("sends source, route and release", () => {
    const send = vi.fn();
    createReporter(send, true)(new Error("x"), "unhandledrejection");
    expect(send.mock.calls[0][0]).toMatchObject({
      message: "Error: x",
      source: "unhandledrejection",
      route: window.location.pathname,
    });
  });
});

describe("claimReload", () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it("reloads once, then lets a quick second failure through", () => {
    const s = store();
    expect(claimReload(s, 1_000_000)).toBe(true);
    expect(claimReload(s, 1_000_000 + 2_000)).toBe(false);
    expect(claimReload(s, 1_000_000 + RELOAD_WINDOW_MS + 1)).toBe(true);
  });

  it("never reloads without storage", () => {
    expect(claimReload(null)).toBe(false);
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => {} };
    expect(claimReload(broken)).toBe(false);
  });
});
