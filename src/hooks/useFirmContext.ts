import { useCallback, useEffect, useState } from "react";

export interface FirmContext {
  practiceArea: string;
  firmSize: string;
  primaryGoal: string;
}

const KEY = "guidebook_firm_context";

export const useFirmContext = () => {
  const [context, setContext] = useState<FirmContext | null>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const save = useCallback((next: FirmContext) => {
    setContext(next);
    localStorage.setItem(KEY, JSON.stringify(next));
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
