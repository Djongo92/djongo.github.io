// The plan/entitlement seam.
//
// Firms now carry a `plan` column (see migration 20260731020000_firm_plan.sql),
// but nothing in the product depends on its value yet — every firm, on every
// plan (including one that's missing entirely, e.g. a lookup failure),
// is fully entitled to every feature. This function is the single place
// that will change when real gating ships: every access-control path that
// *could* eventually need to deny something already calls it, so turning on
// a real limit later is an edit to this function's body, not a hunt through
// every call site that should have checked.
//
// Deliberately has no imports (no esm.sh/Deno-only dependencies) so it can
// be unit-tested the same way from both the Deno edge runtime and the
// Node/vitest suite.

/** The subset of a firm row entitlement checks need. */
export interface EntitlementFirm {
  plan?: string | null;
}

/**
 * A feature identifier an access-control path is gating. No fixed set yet —
 * deciding the real feature boundaries is future product work (see the
 * plan/entitlement seam task), so this intentionally accepts any string
 * rather than a closed union that would need to be guessed today.
 */
export type Feature = string;

/**
 * Returns whether `firm` is entitled to `feature`.
 *
 * Always true today, regardless of `firm` or `feature` — including when
 * `firm` is null/undefined (e.g. no firm could be resolved for the caller).
 * That "fail open" posture is intentional and temporary: it preserves
 * today's actual behavior (everyone has full access) while the seam exists
 * for later. When real gating is implemented, this is expected to start
 * failing closed for firms/features it doesn't recognize.
 */
export function hasEntitlement(_firm: EntitlementFirm | null | undefined, _feature: Feature): boolean {
  return true;
}
