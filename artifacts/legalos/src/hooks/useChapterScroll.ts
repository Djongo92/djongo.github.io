// "Never lose your spot", completed. ?section=guidebook&chapter=<id> already
// reopens the right chapter after a reload; this hook restores WHERE in the
// chapter you were. The position is saved continuously (rAF-throttled) to
// sessionStorage keyed by chapter id — sessionStorage, not localStorage:
// your spot is a per-tab reading session, not an account-level preference.
//
// Restoring is deliberately once per document load, not per chapter-open:
// navigating between chapters mid-session still starts each chapter at the
// top (goToChapter scrolls to 0,0); only a reload pulls the saved offset
// back. The initial chapter is the one in the URL when the app booted,
// captured lazily on the first chapter render so late mounts (post-auth
// lazy sections) still see the boot URL.
import { useEffect } from "react";

const STORAGE_KEY = "legalos_chapter_scroll";

type ScrollMap = Record<string, number>;

const readMap = (): ScrollMap => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as ScrollMap) : {};
  } catch {
    return {};
  }
};

const savePosition = (chapterId: string, y: number) => {
  try {
    const map = readMap();
    map[chapterId] = Math.round(y);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage blocked or full — losing your spot is a nuisance, not an error.
  }
};

// Module-level so the restore is one-shot across remounts (StrictMode
// double-mounts, lazy section remounts). `undefined` = not yet captured.
let pageLoadChapterId: string | null | undefined;
let restoreConsumed = false;

const getPageLoadChapterId = (): string | null => {
  if (pageLoadChapterId === undefined) {
    pageLoadChapterId = new URLSearchParams(window.location.search).get("chapter");
  }
  return pageLoadChapterId;
};

/** Test-only: module state simulates a document load; tests need fresh loads. */
export const __resetChapterScrollForTests = () => {
  pageLoadChapterId = undefined;
  restoreConsumed = false;
};

export const useChapterScroll = (chapterId: string | null) => {
  // Save: continuously while the chapter is open (one write per scroll
  // frame). There is deliberately NO save on unmount: goToChapter scrolls
  // to (0,0) synchronously when navigating, BEFORE React runs this
  // cleanup, so a cleanup save would read the navigation-induced 0 and
  // clobber the outgoing chapter's real offset. The continuous saves have
  // already captured every scroll frame, and the `active` flag blocks a
  // pending rAF save from firing after the listener is gone.
  useEffect(() => {
    if (!chapterId) return;
    let scheduled = false;
    let active = true;
    const save = () => {
      scheduled = false;
      if (!active) return;
      savePosition(chapterId, window.scrollY);
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(save);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      active = false;
      window.removeEventListener("scroll", onScroll);
    };
  }, [chapterId]);

  // Restore: only on the document load that opened this chapter. Two
  // instant jumps — one as early as the mounted article allows, one after
  // ChapterView's staggered entrance animations settle (~0.9s) and stop
  // nudging layout. Both are instant, so at most one correction is ever
  // visible (and that only if the browser itself tried to restore first).
  useEffect(() => {
    if (!chapterId || restoreConsumed || chapterId !== getPageLoadChapterId()) return;
    restoreConsumed = true;
    const y = readMap()[chapterId];
    if (typeof y !== "number" || y <= 0) return;
    const jump = () => window.scrollTo(0, y);
    const raf = requestAnimationFrame(jump);
    const timer = setTimeout(jump, 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [chapterId]);
};
