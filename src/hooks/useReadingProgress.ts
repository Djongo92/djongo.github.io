import { useState, useCallback } from "react";

const STORAGE_KEY = "guidebook_reading_progress";
const LAST_READ_KEY = "guidebook_last_read";

export interface ReadingState {
  readChapters: string[];
  lastReadChapterId: string | null;
}

export const useReadingProgress = () => {
  const [state, setState] = useState<ReadingState>(() => {
    try {
      const read = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const last = localStorage.getItem(LAST_READ_KEY);
      return { readChapters: read, lastReadChapterId: last };
    } catch {
      return { readChapters: [], lastReadChapterId: null };
    }
  });

  const markAsRead = useCallback((chapterId: string) => {
    setState((prev) => {
      const readChapters = prev.readChapters.includes(chapterId)
        ? prev.readChapters
        : [...prev.readChapters, chapterId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readChapters));
      localStorage.setItem(LAST_READ_KEY, chapterId);
      return { readChapters, lastReadChapterId: chapterId };
    });
  }, []);

  const isRead = useCallback(
    (chapterId: string) => state.readChapters.includes(chapterId),
    [state.readChapters]
  );

  return { ...state, markAsRead, isRead };
};
