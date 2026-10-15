import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";

const STORAGE_KEY = "guidebook_implementation";
const SERVER_KEY = "implementation";

type ImplementationState = Record<string, Record<number, boolean>>;

const readLocal = (): ImplementationState => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export const useImplementation = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ImplementationState>(readLocal);
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = await pullServerState<ImplementationState>(SERVER_KEY);
      if (remote && Object.keys(remote).length > 0) {
        setState(remote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      } else {
        pushServerState(SERVER_KEY, readLocal());
      }
    })();
  }, [user]);

  const toggleItem = useCallback((chapterId: string, itemIndex: number) => {
    setState((prev) => {
      const chapter = prev[chapterId] || {};
      const next = {
        ...prev,
        [chapterId]: { ...chapter, [itemIndex]: !chapter[itemIndex] },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      pushServerState(SERVER_KEY, next);
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
