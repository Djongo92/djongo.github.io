import { useCallback, useEffect, useState } from "react";
import type { WorkshopToolId } from "@/lib/handoff";

/**
 * Per-browser run history for Workshop tools. Capped at 50 entries.
 * Each entry stores the tool id, a short title, optional input/output preview,
 * and the full result payload for replay / handoff.
 */
export interface WorkshopRun {
  id: string;
  toolId: WorkshopToolId;
  toolLabel: string;
  title: string;            // short human-readable summary
  preview?: string;         // 1–2 line snippet of the input or output
  output?: string;          // long text/markdown that handoff can re-use
  payload?: unknown;        // anything else worth keeping (judging, etc.)
  createdAt: number;
}

const KEY = "workshop_run_history";
const MAX = 50;

const read = (): WorkshopRun[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WorkshopRun[]) : [];
  } catch { return []; }
};

const write = (runs: WorkshopRun[]) => {
  localStorage.setItem(KEY, JSON.stringify(runs.slice(0, MAX)));
  window.dispatchEvent(new Event("workshop:history-update"));
};

export const recordRun = (run: Omit<WorkshopRun, "id" | "createdAt">) => {
  const all = read();
  all.unshift({ ...run, id: crypto.randomUUID(), createdAt: Date.now() });
  write(all);
};

export const useWorkshopHistory = () => {
  const [runs, setRuns] = useState<WorkshopRun[]>(() => read());

  const refresh = useCallback(() => setRuns(read()), []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("workshop:history-update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("workshop:history-update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  const remove = useCallback((id: string) => {
    write(read().filter((r) => r.id !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { runs, remove, clear, refresh };
};