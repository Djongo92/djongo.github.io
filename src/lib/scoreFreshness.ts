// How long a real, externally-sourced measurement stays trustworthy before a
// viewer should be told to treat it as possibly outdated, rather than it
// silently aging in place. Two different clocks: a firm's own audit
// (verified_at) can be re-run any time, so a 90-day gap is meaningful;
// directory standing (Chambers/Legal 500/IFLR1000) is reviewed quarterly by
// design (see CLAUDE.md's Decided #3), so it gets a longer grace period —
// flagging it stale before the next quarterly review would just be noise.
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
