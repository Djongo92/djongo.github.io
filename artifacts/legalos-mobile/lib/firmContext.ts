/**
 * Structured firm context for workshop tool runs — the exact shape every
 * workshop edge function reads (`firmContext.practiceArea / .firmSize /
 * .primaryGoal`, see e.g. supabase/functions/workshop-bio-rewrite). Mobile
 * used to send a display *string* here; the string was truthy, so functions
 * rendered "Firm context: undefined practice, undefined, primary goal:
 * undefined." into every prompt. Always send this object (or null) instead.
 *
 * Mirrors the web's FirmContext (src/hooks/useFirmContext.ts) and reads the
 * same server-state key the web writes (`firm_context` via user-state-get),
 * so a signed-in account's runs carry *their* firm's context on both surfaces.
 */
export interface FirmContext {
  practiceArea: string;
  firmSize: string;
  primaryGoal: string;
  /** Primary market/jurisdiction. Optional: profiles saved before task #142
   *  predate the field and must keep parsing. AI prompts use it to ground
   *  legal references in the right jurisdiction (no US defaults for CEE). */
  market?: string;
}

/** Same values the web demo seeds (demoData.ts DEMO_FIRM_CONTEXT) — demo
 *  runs on mobile and web must describe the same fictional firm. */
export const DEMO_FIRM_CONTEXT: FirmContext = {
  practiceArea: 'Corporate / M&A',
  firmSize: '11-50 attorneys',
  primaryGoal: 'Win more mid-market M&A mandates',
  market: 'Poland',
};

/** Validates a server-state value into a FirmContext, or null. All three
 *  fields must be non-empty strings — a partial object would put the word
 *  "undefined" right back into the prompt this module exists to keep out. */
export function parseFirmContext(value: unknown): FirmContext | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const ok = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
  if (!ok(v.practiceArea) || !ok(v.firmSize) || !ok(v.primaryGoal)) return null;
  return {
    practiceArea: v.practiceArea,
    firmSize: v.firmSize,
    primaryGoal: v.primaryGoal,
    ...(ok(v.market) ? { market: v.market } : {}),
  };
}

/** The server-state key both surfaces read AND write — one shared constant
 *  so the reader (useFirmContext) and the writer (firm-profile screen) can
 *  never drift on it. */
export const FIRM_CONTEXT_SERVER_KEY = 'firm_context';

/** The exact option lists the web offers (PersonalizeOnboarding.tsx, reused
 *  by the web Settings page) — both surfaces must offer the same choices so
 *  a value saved on one renders selected on the other. The parity test in
 *  firmContext.test.ts fails if either side's list changes. */
export const PRACTICE_AREAS = [
  'Corporate / M&A', 'Litigation', 'Family Law', 'Real Estate', 'IP & Tech',
  'Employment & Labor', 'Tax', 'Criminal Defense', 'Estate Planning', 'Other',
];

export const FIRM_SIZES = [
  'Solo (1 attorney)', 'Small (2-10 attorneys)', 'Mid-size (11-50 attorneys)',
  'Large (51-200 attorneys)', 'Major (200+ attorneys)',
];

export const GOALS = [
  'Win more high-value clients', 'Build firm-wide brand & visibility',
  'Generate qualified inbound leads', 'Position lawyers as thought leaders',
  'Modernize digital presence',
];

/** The exact market list the web offers (PersonalizeOnboarding.tsx MARKETS) —
 *  the parity test fails if either side changes without the other. */
export const MARKETS = [
  'Poland', 'Czechia', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria',
  'Ukraine', 'The Baltics', 'Croatia & the Adriatics', 'Other CEE', 'International / beyond CEE',
];

/** Body for the user-state-set call that saves the profile — the same
 *  key/value shape the web's pushServerState writes (serverStateSync.ts),
 *  so a save on mobile is immediately what the web Settings page reads.
 *
 *  `requestedFirmId` MUST be the `resolvedClientId` from the read that
 *  loaded the profile being edited (see useFirmContext): for accounts in
 *  multiple live firms the resolver may auto-detect a different firm on
 *  each call, and without this pin a save can land on a different firm
 *  than the one the user was shown (same pattern as useBattlePlanSlots). */
export function buildFirmContextSetBody(
  clientId: string,
  accessToken: string,
  ctx: FirmContext,
  requestedFirmId?: string,
) {
  return { clientId, accessToken, key: FIRM_CONTEXT_SERVER_KEY, value: ctx, requestedFirmId };
}

// Save notifications: the firm-profile screen saves while sitting on top of
// the tab stack, so a mounted tool screen's useFirmContext would otherwise
// keep serving the pre-save value on its next run. A module-level emitter
// closes that loop without pulling expo-router's useFocusEffect into the
// hook (expo-router's untranspiled TSX breaks vitest — and the hook's unit
// tests render it outside any navigator).
const savedListeners = new Set<() => void>();

/** Called by the firm-profile screen after a successful save. */
export function notifyFirmContextSaved(): void {
  savedListeners.forEach((l) => l());
}

/** useFirmContext subscribes its loader here; returns an unsubscribe. */
export function onFirmContextSaved(cb: () => void): () => void {
  savedListeners.add(cb);
  return () => {
    savedListeners.delete(cb);
  };
}
