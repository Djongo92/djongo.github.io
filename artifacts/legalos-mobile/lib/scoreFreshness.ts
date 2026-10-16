// How long a real, externally-sourced measurement stays trustworthy before a
// viewer should be told to treat it as possibly outdated, rather than it
// silently aging in place. Mirrors artifacts/legalos/src/lib/scoreFreshness.ts
// so the mobile leaderboard flags a stale audit on the SAME 90-day window as
// the web app (a firm's own audit can be re-run any time, so a 90-day gap is
// meaningful). Directory standing is reviewed quarterly by design and gets a
// longer grace period; mobile only renders directory-standing-only rows
// without a per-row timestamp, so only the audit clock is used here.
export const AUDIT_STALE_AFTER_DAYS = 90;
export const DIRECTORY_STALE_AFTER_DAYS = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(iso: string | null | undefined, now: number = Date.now()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((now - then) / DAY_MS);
}

export function isStale(iso: string | null | undefined, staleAfterDays: number, now?: number): boolean {
  const days = daysSince(iso, now);
  return days !== null && days > staleAfterDays;
}
