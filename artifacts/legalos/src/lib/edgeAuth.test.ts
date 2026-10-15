// Guard for the deployed-CORS constraint on authenticated edge calls.
//
// Task 55 found every authenticated edge call from the web app failing in
// real browsers: the session travelled in a custom `x-user-token` header
// that no deployed function's CORS Access-Control-Allow-Headers accepts,
// so the browser preflight was rejected before the request ever ran. Unit
// tests never exercised a preflight, so nothing caught it.
//
// These tests pin the rule down at the unit level (the paired browser
// smoke check lives in tests/auth-smoke.mjs):
//   1. edgeHeaders puts a signed-in session in `Authorization: Bearer <jwt>`
//      and nowhere else.
//   2. No custom `x-user-token` header ever appears in edgeHeaders output.
//   3. No web source file mentions x-user-token at all — reintroducing it
//      anywhere in the client fails this suite immediately.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { edgeHeaders } from "./edgeAuth";
import { setCurrentUser } from "./currentUser";

const SESSION_JWT = "header-guard-session-jwt";

const headerEntries = (h: HeadersInit): [string, string][] =>
  Object.entries(h as Record<string, string>);

beforeEach(() => {
  localStorage.clear();
  setCurrentUser(null, null);
});

afterEach(() => {
  setCurrentUser(null, null);
});

describe("edgeHeaders session transport (deployed CORS constraint)", () => {
  it("never emits an x-user-token header, signed in or out", () => {
    for (const signedIn of [false, true]) {
      setCurrentUser(signedIn ? "user-1" : null, signedIn ? SESSION_JWT : null);
      const keys = headerEntries(edgeHeaders()).map(([k]) => k.toLowerCase());
      expect(keys).not.toContain("x-user-token");
    }
  });

  it("sends a signed-in session as the Authorization bearer", () => {
    setCurrentUser("user-1", SESSION_JWT);
    const h = Object.fromEntries(headerEntries(edgeHeaders()));
    expect(h.Authorization).toBe(`Bearer ${SESSION_JWT}`);
  });

  it("carries the session JWT in no header other than Authorization", () => {
    setCurrentUser("user-1", SESSION_JWT);
    for (const [key, value] of headerEntries(edgeHeaders())) {
      if (key.toLowerCase() === "authorization") continue;
      expect(value, `session JWT leaked into non-Authorization header "${key}"`).not.toContain(SESSION_JWT);
    }
  });

  it("falls back to the anon key bearer when signed out", () => {
    const h = Object.fromEntries(headerEntries(edgeHeaders()));
    expect(h.Authorization).toMatch(/^Bearer /);
    expect(h.Authorization).not.toContain(SESSION_JWT);
  });
});

describe("web client source never references x-user-token", () => {
  // The deployed edge functions' CORS allow-lists don't accept the
  // x-user-token header (see .agents/memory/edge-cors-user-token.md), so a
  // browser preflight carrying it fails outright. Mobile may use it (no
  // CORS there); the web client must not — anywhere, not just edgeAuth.
  const SRC_ROOT = join(__dirname, "..");
  const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

  const collectSources = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        collectSources(full, out);
      } else if (
        EXTENSIONS.some((ext) => entry.endsWith(ext)) &&
        !/\.test\.[tj]sx?$/.test(entry)
      ) {
        out.push(full);
      }
    }
    return out;
  };

  it("no non-test file under src/ uses 'x-user-token' as a string literal", () => {
    // Comments may mention the header (edgeAuth.ts documents *why* it's
    // banned); only a quoted string literal can actually put it on the wire.
    const literal = /["'`]x-user-token["'`]/i;
    const offenders = collectSources(SRC_ROOT).filter((file) =>
      literal.test(readFileSync(file, "utf8")),
    );
    expect(
      offenders,
      "These web client files reference x-user-token, which the deployed edge functions' CORS rejects in browsers — send the session via Authorization instead",
    ).toEqual([]);
  });
});
