import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";

const STORAGE_KEY = "guidebook_reading_progress";
const LAST_READ_KEY = "guidebook_last_read";
const SERVER_KEY = "reading_progress";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface ReadingState {
  readChapters: string[];
  lastReadChapterId: string | null;
}

const readLocal = (): ReadingState => {
  try {
    const read = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const last = localStorage.getItem(LAST_READ_KEY);
    return { readChapters: read, lastReadChapterId: last };
  } catch {
    return { readChapters: [], lastReadChapterId: null };
  }
};

const writeLocal = (state: ReadingState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.readChapters));
  if (state.lastReadChapterId) localStorage.setItem(LAST_READ_KEY, state.lastReadChapterId);
};

/**
 * Reading progress used to be localStorage-only, like every other
 * guidebook hook — fine for an anonymous browser, but a real account
 * should see the same progress on a different device. This is the first
 * (proof-of-concept) hook migrated to _shared user_app_state: local
 * storage stays the instant read/write cache (and the only storage for
 * demo/anonymous use), while a real session additionally syncs to the
 * server — fetched once on mount (server wins if it has data, otherwise
 * whatever's local is pushed up as a starting point) and pushed on every
 * markAsRead after that.
 */
export const useReadingProgress = () => {
  const { user, session } = useAuth();
  const [state, setState] = useState<ReadingState>(readLocal);
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/user-state-get`, {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ clientId: user.id, accessToken: session?.access_token, keys: [SERVER_KEY] }),
        });
        const data = await resp.json();
        const remote = data?.state?.[SERVER_KEY] as ReadingState | undefined;
        if (remote && Array.isArray(remote.readChapters) && remote.readChapters.length > 0) {
          setState(remote);
          writeLocal(remote);
        } else {
          // Nothing on the server yet — push whatever's local as the starting point.
          await fetch(`${SUPABASE_URL}/functions/v1/user-state-set`, {
            method: "POST",
            headers: edgeHeaders(),
            body: JSON.stringify({ clientId: user.id, accessToken: session?.access_token, key: SERVER_KEY, value: readLocal() }),
          });
        }
      } catch {
        // Local storage already has whatever was there — sync just didn't happen this time.
      }
    })();
  }, [user, session?.access_token]);

  const markAsRead = useCallback((chapterId: string) => {
    setState((prev) => {
      const readChapters = prev.readChapters.includes(chapterId)
        ? prev.readChapters
        : [...prev.readChapters, chapterId];
      const next = { readChapters, lastReadChapterId: chapterId };
      writeLocal(next);
      if (user) {
        const clientId = user.id;
        fetch(`${SUPABASE_URL}/functions/v1/user-state-set`, {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ clientId, accessToken: session?.access_token, key: SERVER_KEY, value: next }),
        }).catch(() => {
          // Best-effort — local storage already has it.
        });
      }
      return next;
    });
  }, [user, session?.access_token]);

  const isRead = useCallback(
    (chapterId: string) => state.readChapters.includes(chapterId),
    [state.readChapters]
  );

  return { ...state, markAsRead, isRead };
};
