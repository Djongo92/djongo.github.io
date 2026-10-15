// Some edge functions exist in this repo (supabase/functions/*) but have
// never been deployed to the hosted Supabase project — there is no deploy
// path from the development environment (see supabase-edge-deploy-gap in
// project memory). Calling one of them produces a 404 plus a failed CORS
// preflight in the console on every signed-in page load, and any feature
// backed by it silently does nothing.
//
// This module is the client's single source of truth for "is this function
// actually there?" so the app can skip the dead call entirely and the UI
// can say the feature is unavailable instead of failing silently.
//
// Two layers:
//  1. KNOWN_UNDEPLOYED — functions we know are not live. When one of these
//     is finally deployed, remove it from the set in the same change.
//  2. Runtime learning — a 404 from any other function is remembered (with
//     a TTL) so a future undeployed function fails once, not on every load,
//     and self-heals after a deployment without a client change.

const TTL_MS = 24 * 60 * 60 * 1000; // re-probe at most once a day
const STORAGE_PREFIX = "legalos_edge_fn_down:";

export const KNOWN_UNDEPLOYED: ReadonlySet<string> = new Set([
  // Add the slug here when an edge function exists in the repo but has not
  // been deployed yet (produces 404 + failed CORS preflight on every load).
  // Remove it in the same release that deploys the function.
  // Currently empty: the six previously-dormant functions (audit snapshots,
  // firm member management, metric disputes, and the Battle Plan workflow)
  // were deployed 2026-08-01 via `supabase functions deploy --use-api`;
  // `pnpm --filter @workspace/legalos run probe:functions` enforces that
  // this set matches the live project.
]);

const readExpiry = (name: string): number => {
  try {
    return parseInt(localStorage.getItem(STORAGE_PREFIX + name) || "0", 10) || 0;
  } catch {
    return 0;
  }
};

/** True when the client should attempt a call to this function. */
export const isEdgeFunctionAvailable = (name: string, now: number = Date.now()): boolean => {
  if (KNOWN_UNDEPLOYED.has(name)) return false;
  return readExpiry(name) <= now;
};

/** True when the function is statically known to be missing (vs. a
 *  transient runtime 404) — UIs can use this for stronger wording. */
export const isEdgeFunctionKnownUndeployed = (name: string): boolean => KNOWN_UNDEPLOYED.has(name);

/**
 * Record the outcome of a call. A 404 marks the function unavailable until
 * the TTL expires; any other status clears a previous mark (the function
 * responded, so it exists — even if it rejected the request).
 */
export const recordEdgeFunctionStatus = (name: string, status: number, now: number = Date.now()): void => {
  try {
    if (status === 404) {
      localStorage.setItem(STORAGE_PREFIX + name, String(now + TTL_MS));
    } else {
      localStorage.removeItem(STORAGE_PREFIX + name);
    }
  } catch {
    // localStorage unavailable (private mode quota etc.) — the known-undeployed
    // set still protects us; runtime learning just won't persist.
  }
};

/** Test helper: clear all runtime-learned marks. */
export const resetEdgeFunctionAvailability = (): void => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
};
