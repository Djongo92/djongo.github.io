// §11 — Consultant layer: which client workspace (firm) the app is
// currently acting as, for a user who belongs to more than one. Persisted
// per-browser (not per-account) — same tradeoff as every other localStorage
// preference in this app (theme, firm context). Every hook that calls a
// workspace-aware edge function reads this and sends it as `activeFirmId`;
// the server (see _shared/verifiedClientId.ts) only honors it if the user
// actually, currently has a live membership there.
import { useCallback, useEffect, useState } from "react";

const KEY = "legalos_active_workspace";

export const useActiveWorkspace = () => {
  const [activeFirmId, setActiveFirmIdState] = useState<string | null>(() => localStorage.getItem(KEY));

  useEffect(() => {
    const onStorage = () => setActiveFirmIdState(localStorage.getItem(KEY));
    window.addEventListener("storage", onStorage);
    window.addEventListener("workspace:change", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("workspace:change", onStorage);
    };
  }, []);

  const setActiveFirmId = useCallback((firmId: string | null) => {
    if (firmId) localStorage.setItem(KEY, firmId);
    else localStorage.removeItem(KEY);
    setActiveFirmIdState(firmId);
    window.dispatchEvent(new Event("workspace:change"));
  }, []);

  return { activeFirmId, setActiveFirmId };
};
