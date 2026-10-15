import { Router, type IRouter } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { VerifyDemoAccessBody, VerifyDemoAccessResponse } from "@workspace/api-zod";
import { createRateLimit } from "../lib/rateLimit";

const router: IRouter = Router();

export interface DemoCode {
  code: string;
  /** Who the code was issued to, shown back in the showcase header. */
  label?: string;
}

/**
 * Reads the configured invitation codes.
 *
 * Format is a comma-separated list of `CODE` or `CODE:Who it was issued to`,
 * which keeps per-recipient codes (and therefore per-recipient revocation) a
 * config change rather than a schema.
 */
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

const digest = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest();

/**
 * Looks up a supplied code.
 *
 * Hashes both sides before comparing so the comparison is fixed-width
 * regardless of code length, and deliberately checks every configured entry
 * instead of returning on the first hit — an early return would make response
 * time depend on which code was guessed.
 */
export function matchDemoCode(codes: DemoCode[], supplied: string): DemoCode | null {
  const target = digest(supplied);
  let found: DemoCode | null = null;
  for (const entry of codes) {
    const hit = timingSafeEqual(digest(entry.code), target);
    if (hit && !found) found = entry;
  }
  return found;
}

// Codes are short and human-typed, so guessing is the realistic attack.
const rateLimit = createRateLimit({
  windowMs: 10 * 60_000,
  max: 10,
  message: "Too many attempts. Please try again shortly.",
});

/** Test-only: clear rate-limit state between tests. */
export const _resetRateLimit = () => rateLimit.reset();

router.post("/demo-access", rateLimit, (req, res) => {
  const codes = parseDemoCodes(process.env.DEMO_ACCESS_CODES);
  // Fail closed. An unconfigured server must not become an open door.
  if (codes.length === 0) {
    res.status(503).json({ message: "The showcase isn't open right now." });
    return;
  }

  const parsed = VerifyDemoAccessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ message: "That code isn't valid." });
    return;
  }

  const match = matchDemoCode(codes, parsed.data.code);
  if (!match) {
    // Logged without the attempted code: it is a credential, and a mistyped
    // one is often a near-miss of a real one.
    req.log.warn({ ip: req.ip }, "rejected showcase access code");
    res.status(401).json({ message: "That code isn't valid." });
    return;
  }

  res.status(200).json(
    VerifyDemoAccessResponse.parse(match.label ? { ok: true, label: match.label } : { ok: true }),
  );
});

export default router;
