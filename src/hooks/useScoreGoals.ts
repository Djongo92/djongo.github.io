import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryKey } from "@/lib/visibilityCategories";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";

// Per-category score targets a firm sets for itself — a personal marker
// rendered alongside the real (server-computed) category score. Synced to
// the server for a real account the same way every other localStorage hook
// is (see useReadingProgress.ts).
export type ScoreGoals = Partial<Record<CategoryKey, number>>;

const KEY = "legalos_score_goals";
const SERVER_KEY = "score_goals";

const read = (): ScoreGoals => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ScoreGoals) : {};
  } catch {
    return {};
  }
};

const write = (goals: ScoreGoals) => {
  localStorage.setItem(KEY, JSON.stringify(goals));
  pushServerState(SERVER_KEY, goals);
  window.dispatchEvent(new Event("score-goals:update"));
};

export const useScoreGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<ScoreGoals>(() => read());
  const syncedForUser = useRef<string | null>(null);

  const refresh = useCallback(() => setGoals(read()), []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("score-goals:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("score-goals:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = await pullServerState<ScoreGoals>(SERVER_KEY);
      if (remote && Object.keys(remote).length > 0) {
        localStorage.setItem(KEY, JSON.stringify(remote));
        refresh();
      } else {
        pushServerState(SERVER_KEY, read());
      }
    })();
  }, [user, refresh]);

  const setGoal = useCallback((key: CategoryKey, target: number | null) => {
    const next = { ...read() };
    if (target === null) delete next[key];
    else next[key] = target;
    write(next);
  }, []);

  const clear = useCallback(() => write({}), []);

  return { goals, setGoal, clear };
};
