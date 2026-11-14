import { lazy, type ComponentType } from "react";

// Like React.lazy, but survives a deploy. Every build gives the page files
// new names, so a tab opened before a deploy asks for a file that no longer
// exists the next time it opens a lazily loaded section. Instead of failing,
// reload once to pick up the new version. A second failure within
// RELOAD_WINDOW_MS is a real error and reaches the error boundary. Without
// storage there's no way to tell a first failure from a reload loop, so it
// never reloads then. (Same pattern as the AmCham demo's lazy-with-reload.)

const KEY = "legalos_chunk_reload";
export const RELOAD_WINDOW_MS = 10_000;

/** True when this failure should trigger a reload; records the attempt. */
export function claimReload(storage: Pick<Storage, "getItem" | "setItem"> | null, now = Date.now()): boolean {
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(KEY) || 0);
    if (now - last <= RELOAD_WINDOW_MS) return false;
    storage.setItem(KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

const sessionStore = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((error) => {
      if (claimReload(sessionStore())) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}
