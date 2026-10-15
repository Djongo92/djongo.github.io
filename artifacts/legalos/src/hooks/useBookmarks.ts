import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";

const STORAGE_KEY = "guidebook_bookmarks";
const SERVER_KEY = "bookmarks";

const readLocal = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const useBookmarks = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<string[]>(readLocal);
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = await pullServerState<string[]>(SERVER_KEY);
      if (remote && remote.length > 0) {
        setBookmarks(remote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      } else {
        pushServerState(SERVER_KEY, readLocal());
      }
    })();
  }, [user]);

  const toggleBookmark = useCallback((chapterId: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      pushServerState(SERVER_KEY, next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (chapterId: string) => bookmarks.includes(chapterId),
    [bookmarks]
  );

  return { bookmarks, toggleBookmark, isBookmarked };
};
