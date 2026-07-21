import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";

const STORAGE_KEY = "guidebook_annotations";
const SERVER_KEY = "annotations";

type Annotations = Record<string, string>;

const readLocal = (): Annotations => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export const useAnnotations = () => {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<Annotations>(readLocal);
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = await pullServerState<Annotations>(SERVER_KEY);
      if (remote && Object.keys(remote).length > 0) {
        setAnnotations(remote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      } else {
        pushServerState(SERVER_KEY, readLocal());
      }
    })();
  }, [user]);

  const setAnnotation = useCallback((chapterId: string, text: string) => {
    setAnnotations((prev) => {
      const next = { ...prev, [chapterId]: text };
      if (!text) delete next[chapterId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      pushServerState(SERVER_KEY, next);
      return next;
    });
  }, []);

  const getAnnotation = useCallback(
    (chapterId: string) => annotations[chapterId] || "",
    [annotations]
  );

  return { annotations, setAnnotation, getAnnotation };
};
