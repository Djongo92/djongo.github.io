import { useState, useCallback } from "react";

const STORAGE_KEY = "guidebook_checklists";

type ChecklistState = Record<string, Record<number, boolean>>;

export const useChecklists = () => {
  const [state, setState] = useState<ChecklistState>(() => {
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

  const isChecked = useCallback(
    (chapterId: string, itemIndex: number) =>
      state[chapterId]?.[itemIndex] || false,
    [state]
  );

  const getProgress = useCallback(
    (chapterId: string, totalItems: number) => {
      if (totalItems === 0) return 0;
      const chapter = state[chapterId] || {};
      const checked = Object.values(chapter).filter(Boolean).length;
      return Math.round((checked / totalItems) * 100);
    },
    [state]
  );

  return { toggleItem, isChecked, getProgress };
};
