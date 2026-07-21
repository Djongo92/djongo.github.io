// Pure helpers for the DNS TXT domain-ownership challenge (see
// visibility-audit-verify-domain) — split out from the fetch-based lookup
// so the parsing/matching logic is unit-testable without mocking network
// calls.
export const CHALLENGE_PREFIX = "legalos-verify=";

export function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export function challengeRecordValue(token: string): string {
  return `${CHALLENGE_PREFIX}${token}`;
}

/** Cloudflare's DoH JSON API wraps TXT values in literal quotes — strip them. */
export function parseTxtAnswers(answers: { data?: string }[]): string[] {
  return answers.map((a) => (a.data ?? "").replace(/^"|"$/g, ""));
}

/** True if any of the domain's TXT records contain this token's challenge value. */
export function matchesChallenge(records: string[], token: string): boolean {
  const expected = challengeRecordValue(token);
  return records.some((r) => r.includes(expected));
}
