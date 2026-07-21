import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";

const STORAGE_KEY = "guidebook_checklists";
const SERVER_KEY = "checklists";

type ChecklistState = Record<string, Record<number, boolean>>;

const readLocal = (): ChecklistState => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export const useChecklists = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ChecklistState>(readLocal);
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = await pullServerState<ChecklistState>(SERVER_KEY);
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
