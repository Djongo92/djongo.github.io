import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkshopToolId } from "@/lib/handoff";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";

/**
 * Per-browser run history for Workshop tools. Capped at 50 entries.
 * Each entry stores the tool id, a short title, optional input/output preview,
 * and the full result payload for replay / handoff. Syncs to the server for
 * a real account (recordRun is called from plain tool components, not a
 * hook, so it reaches the current user via src/lib/currentUser.ts rather
 * than useAuth() directly).
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
const SERVER_KEY = "workshop_run_history";
const MAX = 50;

const read = (): WorkshopRun[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WorkshopRun[]) : [];
  } catch { return []; }
};

const write = (runs: WorkshopRun[]) => {
  localStorage.setItem(KEY, JSON.stringify(runs.slice(0, MAX)));
  pushServerState(SERVER_KEY, runs.slice(0, MAX));
  window.dispatchEvent(new Event("workshop:history-update"));
};

export const recordRun = (run: Omit<WorkshopRun, "id" | "createdAt">) => {
  const all = read();
  all.unshift({ ...run, id: crypto.randomUUID(), createdAt: Date.now() });
  write(all);
};

export const useWorkshopHistory = () => {
  const { user } = useAuth();
  const [runs, setRuns] = useState<WorkshopRun[]>(() => read());
  const syncedForUser = useRef<string | null>(null);

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

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = await pullServerState<WorkshopRun[]>(SERVER_KEY);
      if (remote && remote.length > 0) {
        localStorage.setItem(KEY, JSON.stringify(remote));
        refresh();
      } else {
        pushServerState(SERVER_KEY, read());
      }
    })();
  }, [user, refresh]);

  const remove = useCallback((id: string) => {
    write(read().filter((r) => r.id !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { runs, remove, clear, refresh };
};
