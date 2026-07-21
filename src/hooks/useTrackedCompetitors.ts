import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";

export interface TrackedCompetitor {
  domain: string;
  displayName?: string;
}

const KEY = "legalos_tracked_competitors";
const SERVER_KEY = "tracked_competitors";
const MAX = 5;

const read = (): TrackedCompetitor[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackedCompetitor[]) : [];
  } catch {
    return [];
  }
};

const write = (list: TrackedCompetitor[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  pushServerState(SERVER_KEY, list);
  window.dispatchEvent(new Event("competitors:update"));
};

const normalizeDomain = (input: string) =>
  input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/**
 * Firms a user wants tracked alongside their own score. Comparison data
 * comes from other firms' already-published (is_public = true) audits,
 * read directly via the public RLS policy — the watchlist itself now
 * syncs to the server for a real account, same pattern as every other
 * localStorage hook (see useReadingProgress.ts).
 */
export const useTrackedCompetitors = () => {
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState<TrackedCompetitor[]>(() => read());
  const syncedForUser = useRef<string | null>(null);

  const refresh = useCallback(() => setCompetitors(read()), []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("competitors:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("competitors:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = await pullServerState<TrackedCompetitor[]>(SERVER_KEY);
      if (remote && remote.length > 0) {
        localStorage.setItem(KEY, JSON.stringify(remote));
        refresh();
      } else {
        pushServerState(SERVER_KEY, read());
      }
    })();
  }, [user, refresh]);

  const add = useCallback((domainInput: string, displayName?: string) => {
    const domain = normalizeDomain(domainInput);
    if (!domain) return false;
    const current = read();
    if (current.length >= MAX || current.some((c) => c.domain === domain)) return false;
    write([...current, { domain, displayName: displayName?.trim() || undefined }]);
    return true;
  }, []);

  const remove = useCallback((domain: string) => {
    write(read().filter((c) => c.domain !== domain));
  }, []);

  return { competitors, add, remove, maxReached: competitors.length >= MAX, max: MAX };
};
