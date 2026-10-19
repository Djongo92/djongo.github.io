import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState, pullServerState } from "@/lib/serverStateSync";
import { normalizePillars, type PillarPreset } from "@/lib/pillarLens";

// A visitor's own saved pillar combinations. Kept in localStorage for
// everyone; for a signed-in account it also syncs to user_app_state, so a
// firm's presets follow it across devices.
const STORAGE_KEY = "uvid_pillar_presets";
const SERVER_KEY = "pillar_presets";
const MAX_PRESETS = 6;

const sanitize = (raw: unknown): PillarPreset[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is PillarPreset => !!p && typeof p === "object" && typeof (p as PillarPreset).label === "string")
    .map((p) => ({
      id: String(p.id),
      label: p.label.slice(0, 40),
      blurb: "",
      pillars: normalizePillars(Array.isArray(p.pillars) ? p.pillars : []),
    }))
    .filter((p) => p.pillars.length > 0)
    .slice(0, MAX_PRESETS);
};

const readLocal = (): PillarPreset[] => {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
};

const writeLocal = (presets: PillarPreset[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Private mode / blocked storage — presets just won't persist locally.
  }
};

export const usePillarPresets = () => {
  const { user } = useAuth();
  const [presets, setPresets] = useState<PillarPreset[]>(readLocal);
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      const remote = sanitize(await pullServerState<unknown>(SERVER_KEY));
      if (remote.length > 0) {
        setPresets(remote);
        writeLocal(remote);
      } else {
        const local = readLocal();
        if (local.length > 0) pushServerState(SERVER_KEY, local);
      }
    })();
  }, [user]);

  const commit = useCallback((next: PillarPreset[]) => {
    setPresets(next);
    writeLocal(next);
    pushServerState(SERVER_KEY, next);
  }, []);

  const savePreset = useCallback(
    (label: string, pillars: readonly string[]): PillarPreset | null => {
      const clean = normalizePillars(pillars);
      const name = label.trim().slice(0, 40);
      if (!name || clean.length === 0) return null;
      const preset: PillarPreset = { id: `my-${Date.now().toString(36)}`, label: name, blurb: "", pillars: clean };
      commit([...presets, preset].slice(-MAX_PRESETS));
      return preset;
    },
    [presets, commit],
  );

  const removePreset = useCallback((id: string) => commit(presets.filter((p) => p.id !== id)), [presets, commit]);

  return { presets, savePreset, removePreset, canSaveMore: presets.length < MAX_PRESETS };
};
