import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";

export interface FirmContext {
  practiceArea: string;
  firmSize: string;
  primaryGoal: string;
  /** Primary market/jurisdiction — optional because profiles saved before
   *  the field existed (task #142) must keep parsing. AI prompts use it to
   *  ground legal references in the right jurisdiction. */
  market?: string;
}

const KEY = "guidebook_firm_context";
const SERVER_KEY = "firm_context";

const readLocal = (): FirmContext | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useFirmContext = () => {
  const { user } = useAuth();
  const [context, setContext] = useState<FirmContext | null>(readLocal);
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = await pullServerState<FirmContext>(SERVER_KEY);
      if (remote) {
        setContext(remote);
        localStorage.setItem(KEY, JSON.stringify(remote));
      } else {
        const local = readLocal();
        if (local) pushServerState(SERVER_KEY, local);
      }
    })();
  }, [user]);

  const save = useCallback((next: FirmContext) => {
    setContext(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    pushServerState(SERVER_KEY, next);
  }, []);

  const clear = useCallback(() => {
    setContext(null);
    localStorage.removeItem(KEY);
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) {
        try {
          setContext(e.newValue ? JSON.parse(e.newValue) : null);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { context, save, clear, hasContext: !!context };
};
