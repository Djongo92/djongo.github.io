// A firm's own logo, stored as a data URL — same per-browser localStorage
// pattern as useFirmContext, not tied to a real account yet. Shown in the
// sidebar and embedded in the Battle Plan PDF cover when present.
import { useCallback, useState } from "react";

const KEY = "guidebook_firm_logo";

export const useFirmLogo = () => {
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem(KEY));

  const save = useCallback((dataUrl: string) => {
    setLogo(dataUrl);
    localStorage.setItem(KEY, dataUrl);
  }, []);

  const clear = useCallback(() => {
    setLogo(null);
    localStorage.removeItem(KEY);
  }, []);

  return { logo, save, clear };
};
