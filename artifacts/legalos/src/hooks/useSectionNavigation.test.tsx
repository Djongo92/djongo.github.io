// The Battle Plan's URL contract: ?section=battleplan must open the battle
// plan (reloads/bookmarks), goToSection must write the param (so every
// sidebar/teaser/palette entry lands on that URL), bogus values must fall
// back to the dashboard, and dashboard itself keeps a clean URL.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useSectionNavigation, isSection, isChapterId } from "./useSectionNavigation";
import { chapters } from "@/data/chapters";

const wrapperFor = (initial: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
  };

const renderNav = (initial: string) =>
  renderHook(() => ({ nav: useSectionNavigation(), loc: useLocation() }), {
    wrapper: wrapperFor(initial),
  });

describe("isSection", () => {
  it("accepts every real section and rejects anything else", () => {
    expect(isSection("battleplan")).toBe(true);
    expect(isSection("dashboard")).toBe(true);
    expect(isSection("settings")).toBe(true);
    expect(isSection("nope")).toBe(false);
    expect(isSection("")).toBe(false);
    expect(isSection(null)).toBe(false);
  });
});

describe("useSectionNavigation", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("defaults to the dashboard on a bare URL", () => {
    const { result } = renderNav("/");
    expect(result.current.nav.section).toBe("dashboard");
  });

  it("opens the section named in the URL — the reload/bookmark case", () => {
    const { result } = renderNav("/?section=battleplan");
    expect(result.current.nav.section).toBe("battleplan");
  });

  it("falls back to the dashboard for a bogus section value", () => {
    const { result } = renderNav("/?section=definitely-not-a-section");
    expect(result.current.nav.section).toBe("dashboard");
  });

  it("goToSection writes the param so navigators land on that URL", () => {
    const { result } = renderNav("/");
    act(() => result.current.nav.goToSection("battleplan"));
    expect(result.current.loc.search).toContain("section=battleplan");
    expect(result.current.nav.section).toBe("battleplan");
  });

  it("going back to the dashboard restores a clean URL", () => {
    const { result } = renderNav("/?section=progress");
    act(() => result.current.nav.goToSection("dashboard"));
    expect(result.current.loc.search).not.toContain("section=");
    expect(result.current.nav.section).toBe("dashboard");
  });

  it("preserves unrelated query params (e.g. a sign-in code)", () => {
    const { result } = renderNav("/?code=abc123");
    act(() => result.current.nav.goToSection("workshop"));
    expect(result.current.loc.search).toContain("code=abc123");
    expect(result.current.loc.search).toContain("section=workshop");
  });
});

// The guidebook's URL contract: reloading mid-chapter must reopen that
// chapter, unknown chapter ids fall back to the TOC (never crash), the
// bookmarks view survives a reload, and leaving the guidebook clears its
// sub-state so it doesn't resurrect on the next visit.
describe("guidebook sub-state in the URL", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  const realId = chapters[0].id;

  it("isChapterId accepts every real chapter id and rejects anything else", () => {
    for (const c of chapters) expect(isChapterId(c.id)).toBe(true);
    expect(isChapterId("not-a-chapter")).toBe(false);
    expect(isChapterId("")).toBe(false);
    expect(isChapterId(null)).toBe(false);
  });

  it("reopens the chapter named in the URL — the reload/bookmark case", () => {
    const { result } = renderNav(`/?section=guidebook&chapter=${realId}`);
    expect(result.current.nav.section).toBe("guidebook");
    expect(result.current.nav.currentChapterId).toBe(realId);
    expect(result.current.nav.guidebookView).toBe("chapter");
  });

  it("falls back to the TOC for an unknown chapter id", () => {
    const { result } = renderNav("/?section=guidebook&chapter=bogus-id");
    expect(result.current.nav.currentChapterId).toBeNull();
    expect(result.current.nav.guidebookView).toBe("toc");
  });

  it("ignores a chapter param outside the guidebook section", () => {
    const { result } = renderNav(`/?section=workshop&chapter=${realId}`);
    expect(result.current.nav.currentChapterId).toBeNull();
  });

  it("the bookmarks view survives a reload via ?view=bookmarks", () => {
    const { result } = renderNav("/?section=guidebook&view=bookmarks");
    expect(result.current.nav.guidebookView).toBe("bookmarks");
    act(() => result.current.nav.goToGuidebookView("toc"));
    expect(result.current.nav.guidebookView).toBe("toc");
    expect(result.current.loc.search).not.toContain("view=");
  });

  it("goToChapter sets section and chapter in one navigation (deep-link from another section)", () => {
    const { result } = renderNav("/?section=progress");
    act(() => result.current.nav.goToChapter(realId));
    expect(result.current.nav.section).toBe("guidebook");
    expect(result.current.nav.currentChapterId).toBe(realId);
    expect(result.current.loc.search).toContain(`chapter=${realId}`);
  });

  it("leaving the guidebook clears chapter and view params", () => {
    const { result } = renderNav(`/?section=guidebook&chapter=${realId}`);
    act(() => result.current.nav.goToSection("dashboard"));
    expect(result.current.loc.search).not.toContain("chapter=");
    expect(result.current.nav.currentChapterId).toBeNull();
  });

  it("goToGuidebookView('bookmarks') closes the open chapter and writes view=bookmarks", () => {
    const { result } = renderNav(`/?section=guidebook&chapter=${realId}`);
    act(() => result.current.nav.goToGuidebookView("bookmarks"));
    expect(result.current.nav.currentChapterId).toBeNull();
    expect(result.current.nav.guidebookView).toBe("bookmarks");
    expect(result.current.loc.search).toContain("view=bookmarks");
  });
});
