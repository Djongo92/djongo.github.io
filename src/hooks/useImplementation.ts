import { useState, useCallback } from "react";

const STORAGE_KEY = "guidebook_implementation";

type ImplementationState = Record<string, Record<number, boolean>>;

export const useImplementation = () => {
  const [state, setState] = useState<ImplementationState>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  const toggleItem = useCallback((chapterId: string, itemIndex: number) => {
    setState((prev) => {
      const chapter = prev[chapterId] || {};
      const next = {
        ...prev,
        [chapterId]: { ...chapter, [itemIndex]: !chapter[itemIndex] },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isImplemented = useCallback(
    (chapterId: string, itemIndex: number) =>
      state[chapterId]?.[itemIndex] || false,
    [state]
  );

  const getChapterScore = useCallback(
    (chapterId: string, totalItems: number) => {
      if (totalItems === 0) return 0;
      const chapter = state[chapterId] || {};
      const done = Object.values(chapter).filter(Boolean).length;
      return Math.round((done / totalItems) * 100);
    },
    [state]
  );

  const getOverallScore = useCallback(
    (chapterActions: { chapterId: string; total: number }[]) => {
      let totalItems = 0;
      let doneItems = 0;
      chapterActions.forEach(({ chapterId, total }) => {
        totalItems += total;
        const chapter = state[chapterId] || {};
        doneItems += Object.values(chapter).filter(Boolean).length;
      });
      return totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);
    },
    [state]
  );

  return { toggleItem, isImplemented, getChapterScore, getOverallScore };
};
