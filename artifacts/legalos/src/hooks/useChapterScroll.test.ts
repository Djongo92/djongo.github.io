import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChapterScroll, __resetChapterScrollForTests } from "./useChapterScroll";

const KEY = "legalos_chapter_scroll";
const originalScrollTo = window.scrollTo;

const setScrollY = (y: number) =>
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });

const readStored = (): Record<string, number> => JSON.parse(sessionStorage.getItem(KEY) ?? "{}");

beforeEach(() => {
  sessionStorage.clear();
  __resetChapterScrollForTests();
  // Synchronous rAF so the throttled scroll-save lands immediately.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0; });
  window.history.replaceState({}, "", "/app/?section=guidebook&chapter=ch-one");
  setScrollY(0);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.scrollTo = originalScrollTo;
});

describe("useChapterScroll — saving", () => {
  it("saves the position on scroll", () => {
    renderHook(() => useChapterScroll("ch-one"));
    setScrollY(2400);
    window.dispatchEvent(new Event("scroll"));
    expect(readStored()).toEqual({ "ch-one": 2400 });
  });

  it("unmounting never overwrites the last scrolled position with a navigation-induced 0", () => {
    // The real failure this guards: goToChapter scrolls to (0,0)
    // synchronously, THEN React runs the effect cleanup — a cleanup save
    // would clobber the chapter's real offset with 0.
    const { unmount } = renderHook(() => useChapterScroll("ch-one"));
    setScrollY(2400);
    window.dispatchEvent(new Event("scroll"));
    expect(readStored()["ch-one"]).toBe(2400);
    setScrollY(0); // goToChapter's synchronous reset, before cleanup
    unmount();
    expect(readStored()["ch-one"]).toBe(2400);
  });

  it("keeps chapter A's offset through the real navigation path to chapter B", () => {
    // Chapter A is open and scrolled — the continuous save recorded 2400.
    const view = renderHook(({ id }) => useChapterScroll(id), { initialProps: { id: "ch-a" } });
    setScrollY(2400);
    window.dispatchEvent(new Event("scroll"));
    expect(readStored()["ch-a"]).toBe(2400);

    // goToChapter: URL change (new chapterId prop) + synchronous
    // scrollTo(0,0). React's cleanup removes A's listener before the
    // browser dispatches its async scroll-0 event, so only B hears it.
    setScrollY(0);
    view.rerender({ id: "ch-b" });
    window.dispatchEvent(new Event("scroll"));

    expect(readStored()["ch-a"]).toBe(2400); // A's spot survived
    expect(readStored()["ch-b"]).toBe(0);
  });

  it("keeps positions per chapter id instead of one global spot", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ "ch-two": 500 }));
    renderHook(() => useChapterScroll("ch-one"));
    setScrollY(100);
    window.dispatchEvent(new Event("scroll"));
    expect(readStored()).toEqual({ "ch-two": 500, "ch-one": 100 });
  });
});

describe("useChapterScroll — restore after reload", () => {
  it("restores the saved offset when the document loaded on this chapter", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ "ch-one": 1800 }));
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    renderHook(() => useChapterScroll("ch-one"));
    expect(scrollTo).toHaveBeenCalledWith(0, 1800);
  });

  it("does NOT restore a chapter the page did not load on — in-session navigation starts at the top", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ "ch-two": 900 }));
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    renderHook(() => useChapterScroll("ch-two")); // boot URL's chapter is ch-one
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("restores at most once per document load (remounts don't jump again)", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ "ch-one": 700 }));
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    renderHook(() => useChapterScroll("ch-one")).unmount();
    renderHook(() => useChapterScroll("ch-one"));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("fires a second settle jump once the entrance animations have landed", () => {
    // Fake only setTimeout — the sync rAF stub from beforeEach must survive
    // so the first jump stays observable.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    sessionStorage.setItem(KEY, JSON.stringify({ "ch-one": 1800 }));
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    renderHook(() => useChapterScroll("ch-one"));
    expect(scrollTo).toHaveBeenCalledTimes(1); // the immediate rAF jump
    vi.advanceTimersByTime(1000);
    expect(scrollTo).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("ignores corrupt storage rather than crashing the chapter", () => {
    sessionStorage.setItem(KEY, "not json{");
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    renderHook(() => useChapterScroll("ch-one"));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does nothing while no chapter is open", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    renderHook(() => useChapterScroll(null));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
