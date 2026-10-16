// Pure invitation-code logic for the gated product showcase (showcase-access).
// No Deno globals, no network — exercised directly by the vitest suite.
//
// Codes live in the DEMO_ACCESS_CODES secret as a comma-separated list of
// `CODE` or `CODE:Who it was issued to`, so per-recipient codes (and therefore
// per-recipient revocation) are a config change rather than a schema.

export interface DemoCode {
  code: string;
  /** Who the code was issued to, shown back in the showcase header. */
  label?: string;
}

export function parseDemoCodes(raw: string | undefined | null): DemoCode[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const sep = entry.indexOf(":");
      if (sep === -1) return { code: entry };
      const code = entry.slice(0, sep).trim();
      const label = entry.slice(sep + 1).trim();
      return label ? { code, label } : { code };
    })
    .filter((entry) => entry.code.length > 0);
}

const enc = new TextEncoder();

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value.trim().toLowerCase())));
}

/** Fixed-width comparison: both sides are 32-byte digests, every byte is visited. */
function equalDigests(a: Uint8Array, b: Uint8Array): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Looks up a supplied code. Hashes both sides so the comparison is
 * fixed-width regardless of code length, and checks every configured entry
 * instead of returning on the first hit — an early return would make
 * response time depend on which code was guessed.
 */
export async function matchDemoCode(codes: DemoCode[], supplied: string): Promise<DemoCode | null> {
  const target = await digest(supplied);
  let found: DemoCode | null = null;
  for (const entry of codes) {
    const hit = equalDigests(await digest(entry.code), target);
    if (hit && !found) found = entry;
  }
  return found;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalized email, or null when it isn't a plausible address. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 320 && EMAIL_RE.test(email) ? email : null;
}

/** Honeypot: real users never fill the hidden `website` field; bots often do. */
export function isHoneypotFilled(body: unknown): boolean {
  const v = (body as Record<string, unknown> | null)?.website;
  return typeof v === "string" && v !== "";
}
