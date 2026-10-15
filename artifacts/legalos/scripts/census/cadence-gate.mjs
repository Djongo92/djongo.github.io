// Quarterly cadence gate for FULL census sweeps.
//
// A full sweep re-measures every manifest firm and spends paid provider
// budget (PageSpeed, DataForSEO, Gemini) on each one. External signals —
// backlinks, directory standings, press — move quarterly at best, so
// re-measuring the whole market more often than that is pure spend with no
// information gain (and it is how a dead provider balance once overwrote a
// good dataset, see .agents/memory/seo-provider-billing-lapse.md).
//
// Scope: full sweeps only (`--force` without `--only`). Targeted --only
// refreshes keep their own ledger and stay exempt; --override-cadence is
// the deliberate, user-sanctioned escape hatch. The runner feeds this the
// completion marker (.census-last-full-sweep.json), written only when the
// WHOLE manifest stands done — never a per-row updated_at, which a targeted
// refresh also bumps — with the main ledger's newest "done" timestamp as
// the bootstrap fallback for sweeps that predate the marker.
export const FULL_SWEEP_CADENCE_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {string|null} lastSweepIso  when the last full sweep measured (null = never)
 * @param {string}      nowIso
 * @param {number}      cadenceDays
 * @returns {{allowed: boolean, daysSince: number|null, nextAllowedIso?: string}}
 */
export function cadenceGateDecision(lastSweepIso, nowIso, cadenceDays = FULL_SWEEP_CADENCE_DAYS) {
  if (!lastSweepIso) return { allowed: true, daysSince: null };
  const last = new Date(lastSweepIso).getTime();
  const now = new Date(nowIso).getTime();
  // An unparseable clock state must not brick the tool — allow, and let the
  // caller print a loud warning so a silently-broken ledger gets noticed.
  if (!Number.isFinite(last) || !Number.isFinite(now)) return { allowed: true, daysSince: null };
  const daysSince = (now - last) / DAY_MS;
  if (daysSince >= cadenceDays) return { allowed: true, daysSince };
  return {
    allowed: false,
    daysSince,
    nextAllowedIso: new Date(last + cadenceDays * DAY_MS).toISOString(),
  };
}
