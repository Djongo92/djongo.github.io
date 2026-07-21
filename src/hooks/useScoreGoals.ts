import { useCallback, useEffect, useState } from "react";
import type { CategoryKey } from "@/lib/visibilityCategories";

// Per-category score targets a firm sets for itself — purely local, no
// server round-trip needed since it's just a personal marker rendered
// alongside the real (server-computed) category score.
export type ScoreGoals = Partial<Record<CategoryKey, number>>;

const KEY = "legalos_score_goals";

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
  window.dispatchEvent(new Event("score-goals:update"));
};

export const useScoreGoals = () => {
  const [goals, setGoals] = useState<ScoreGoals>(() => read());

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

  const setGoal = useCallback((key: CategoryKey, target: number | null) => {
    const next = { ...read() };
    if (target === null) delete next[key];
    else next[key] = target;
    write(next);
  }, []);

  const clear = useCallback(() => write({}), []);

  return { goals, setGoal, clear };
};
