// Section ↔ URL sync. App sections used to live only in component state,
// so a reload or a shared link dropped the visitor back on the dashboard —
// the Battle Plan page in particular was pitched as "a page in the product"
// and a page you can't bookmark isn't one. The section is now *derived*
// from the ?section= search param (single source of truth: no sync effects,
// no state-vs-URL loops), so reloads, bookmarks, and browser back/forward
// all keep your place for free. Dashboard keeps a clean URL (no param).
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { Section } from "@/components/AppShell";
import { chapters } from "@/data/chapters";

const SECTION_PARAM = "section";
// Guidebook sub-state lives in the URL for the same reason sections do: a
// reload mid-chapter used to drop the reader back on the table of contents —
// for a 12-chapter reading app, the one place losing your spot actually
// stings. `chapter` holds the chapter id, `view=bookmarks` the saved-only
// TOC; both are meaningless outside ?section=guidebook and are cleared when
// navigating anywhere else.
const CHAPTER_PARAM = "chapter";
const VIEW_PARAM = "view";
const BOOKMARKS_VIEW = "bookmarks";

export type GuidebookView = "toc" | "chapter" | "bookmarks";

// Kept in sync with the Section union in AppShell.tsx — a runtime whitelist
// so a bogus or hand-typed ?section= value falls back to the dashboard
// instead of rendering a blank content area.
const VALID_SECTIONS: readonly string[] = [
  "dashboard", "analytics", "workshop", "progress", "guidebook", "settings", "battleplan",
];

export const isSection = (value: string | null | undefined): value is Section =>
  !!value && VALID_SECTIONS.includes(value);

// Same whitelist-and-fallback discipline as sections: a bogus or hand-typed
// ?chapter= value falls back to the TOC instead of crashing on an undefined
// chapter lookup.
export const isChapterId = (value: string | null | undefined): value is string =>
  !!value && chapters.some((c) => c.id === value);

export const useSectionNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get(SECTION_PARAM);
  const section: Section = isSection(param) ? param : "dashboard";

  // Derived, never stored: the chapter param only means anything while the
  // guidebook section is active, and an unknown id degrades to the TOC.
  const chapterParam = searchParams.get(CHAPTER_PARAM);
  const currentChapterId: string | null =
    section === "guidebook" && isChapterId(chapterParam) ? chapterParam : null;
  const guidebookView: GuidebookView = currentChapterId
    ? "chapter"
    : searchParams.get(VIEW_PARAM) === BOOKMARKS_VIEW
      ? "bookmarks"
      : "toc";

  const goToSection = useCallback(
    (next: Section) => {
      // Push (not replace): moving between sections is navigation, so the
      // back button should retrace it. Other params (e.g. a sign-in code)
      // are preserved — but guidebook sub-state is not: leaving the
      // guidebook (or re-entering it from the nav) means a fresh TOC, not a
      // stale chapter resurrected from an old URL.
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (next === "dashboard") params.delete(SECTION_PARAM);
        else params.set(SECTION_PARAM, next);
        params.delete(CHAPTER_PARAM);
        params.delete(VIEW_PARAM);
        return params;
      });
      window.scrollTo(0, 0);
    },
    [setSearchParams],
  );

  // Section + chapter set in one navigation, so deep-links from other
  // sections (e.g. My Progress → a chapter) don't race two history pushes.
  const goToChapter = useCallback(
    (id: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set(SECTION_PARAM, "guidebook");
        params.set(CHAPTER_PARAM, id);
        params.delete(VIEW_PARAM);
        return params;
      });
      window.scrollTo(0, 0);
    },
    [setSearchParams],
  );

  const goToGuidebookView = useCallback(
    (view: "toc" | "bookmarks") => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set(SECTION_PARAM, "guidebook");
        params.delete(CHAPTER_PARAM);
        if (view === "bookmarks") params.set(VIEW_PARAM, BOOKMARKS_VIEW);
        else params.delete(VIEW_PARAM);
        return params;
      });
      window.scrollTo(0, 0);
    },
    [setSearchParams],
  );

  return { section, goToSection, guidebookView, currentChapterId, goToChapter, goToGuidebookView };
};
