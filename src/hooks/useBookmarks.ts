import { useState, useCallback } from "react";

const STORAGE_KEY = "guidebook_bookmarks";

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const toggleBookmark = useCallback((chapterId: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (chapterId: string) => bookmarks.includes(chapterId),
    [bookmarks]
  );

  return { bookmarks, toggleBookmark, isBookmarked };
};
