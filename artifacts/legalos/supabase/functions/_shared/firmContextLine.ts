// Shared one-line firm-context formatter + the jurisdiction rule. Every AI
// prompt that personalizes on the client-supplied firmContext must use these
// — hand-rolled prompt lines are how a Warsaw boutique got FMLA advice
// (task #142). The static guard in tests/ai-context-coverage.test.ts fails
// the build if a function interpolates firmContext.practiceArea directly.
export interface ClientFirmContext {
  practiceArea?: string;
  firmSize?: string;
  primaryGoal?: string;
  market?: string;
}

export interface JurisdictionResolution {
  market?: string;
  source: "profile" | "client" | "none";
}

/** Single source of truth for the firm's jurisdiction (task #147).
 *
 *  Two fields can carry a market into a prompt: the server-side
 *  firm_profiles.jurisdictions (firm memory, edited in Firm Profile settings,
 *  rendered as the profile block's "Jurisdictions:" line) and the
 *  client-supplied firm_context.market (localStorage, from onboarding /
 *  Settings / mobile). When both exist they can disagree, and a prompt that
 *  carries both has no winner.
 *
 *  PRECEDENCE: the server-side firm profile is authoritative — it is
 *  firm-scoped, verified, and deliberately maintained. The client market is
 *  the fallback for anonymous sessions and firms whose profile has no
 *  jurisdictions yet. When the profile wins, firmContextLine suppresses the
 *  client market so the market appears in the prompt exactly once.
 *
 *  Since task #156, user-state-set write-throughs a saved firm_context.market
 *  into firm_profiles.jurisdictions (see _shared/marketProfileSync.ts), so in
 *  the steady state the two values agree and this precedence only matters for
 *  rows saved before the sync existed or by members who can't edit the
 *  profile. */
export function resolveEffectiveMarket(
  clientMarket: string | null | undefined,
  profileJurisdictions: string[] | null | undefined,
): JurisdictionResolution {
  const profileMarket = profileJurisdictions?.find((j) => typeof j === "string" && j.trim());
  if (profileMarket) return { market: profileMarket.trim(), source: "profile" };
  const client = typeof clientMarket === "string" ? clientMarket.trim() : "";
  if (client) return { market: client, source: "client" };
  return { source: "none" };
}

/** Renders the firm context line for a system prompt, or "" when absent.
 *  Pass the firm profile's jurisdictions when known (from buildFirmContext):
 *  if the profile carries them, they are authoritative and the client market
 *  is suppressed here so the two fields can never conflict in one prompt. */
export function firmContextLine(
  firmContext: ClientFirmContext | null | undefined,
  profileJurisdictions?: string[] | null,
): string {
  if (!firmContext || typeof firmContext !== "object") return "";
  const effective = resolveEffectiveMarket(firmContext.market, profileJurisdictions);
  const parts = [
    firmContext.practiceArea && `${firmContext.practiceArea} practice`,
    firmContext.firmSize,
    effective.source === "client" && effective.market && `primary market: ${effective.market}`,
    firmContext.primaryGoal && `primary goal: ${firmContext.primaryGoal}`,
  ].filter(Boolean);
  return parts.length ? `\nFirm context: ${parts.join(", ")}.` : "";
}

/** Append to every system prompt that consumes firmContext. This is the rule
 *  that stops the model from defaulting to US regulators for non-US firms. */
export const JURISDICTION_RULE =
  "Jurisdiction rule: the firm's primary market comes from the FIRM PROFILE (Jurisdictions — " +
  "the authoritative, firm-managed value) when present, otherwise from the firm-context line's " +
  "primary market. A Market line inside audit history is a historical record of what a past " +
  "audit scored, not a current preference. Ground every legal reference (regulators, statutes, " +
  "agencies, courts, programs) in that market's jurisdiction. Never default to US-specific law — " +
  "no FMLA, Department of Labor, IRS, ADA, SEC, or state bars — unless the firm's market is the " +
  "United States.";
