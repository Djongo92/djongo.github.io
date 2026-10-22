import { lazy, type ComponentType } from 'react';

// Like React.lazy, but recovers when a page's code file has gone missing.
// Each deploy gives the files new names, so a tab opened before a deploy can
// ask for a file that no longer exists. Instead of showing the error screen,
// reload once to pick up the new version; a second failure within a few
// seconds is a real error and is shown as usual.

const KEY = 'amcham_chunk_reload';
const WINDOW_MS = 10_000;

export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((error) => {
      // Without storage there's no way to tell a first failure from a reload
      // loop, so don't reload at all.
      let last = Infinity;
      try {
        last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last > WINDOW_MS) sessionStorage.setItem(KEY, String(Date.now()));
      } catch { /* storage blocked */ }
      if (Date.now() - last > WINDOW_MS) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}
