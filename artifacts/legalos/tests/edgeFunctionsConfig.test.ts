// @vitest-environment node
// Repo-invariant guards for the edge-function tree. Pure file reads, no
// network — runs in the normal vitest suite and therefore in CI.
//
// 1. Every function has a [functions.<slug>] entry in supabase/config.toml
//    with verify_jwt = false. CI deploys ALL functions from that file
//    (.github/workflows/deploy-functions.yml); a missing entry silently
//    deploys with verify_jwt = true, and the gateway then 401s cron calls
//    (x-cron-secret only) and anything sent with the publishable key, which
//    is not a JWT. Four functions shipped that way before this test existed.
// 2. Every *.test.ts under supabase/functions has a runner: either it is a
//    native Deno.test file (run by test:deno) or it imports vitest (run by
//    the vitest suite). A file that does neither is dead coverage.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error — plain .mjs helper shared with vitest.config.ts, no types
import { APP_ROOT, FUNCTIONS_DIR, edgeTestFiles, isDenoTestSource } from "../scripts/denoTestFiles.mjs";

const functionSlugs = (): string[] =>
  readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && existsSync(join(FUNCTIONS_DIR, d.name, "index.ts")))
    .map((d) => d.name)
    .sort();

/** Parses `[functions.<slug>]` sections and their verify_jwt value. */
const verifyJwtBySlug = (toml: string): Map<string, string | null> => {
  const out = new Map<string, string | null>();
  let current: string | null = null;
  for (const raw of toml.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    const section = line.match(/^\[functions\.([^\]]+)\]$/);
    if (section) {
      current = section[1];
      out.set(current, null);
      continue;
    }
    if (line.startsWith("[")) {
      current = null;
      continue;
    }
    const kv = line.match(/^verify_jwt\s*=\s*(\S+)$/);
    if (current && kv) out.set(current, kv[1]);
  }
  return out;
};

describe("supabase/config.toml covers every edge function", () => {
  const toml = readFileSync(join(APP_ROOT, "supabase", "config.toml"), "utf8");
  const entries = verifyJwtBySlug(toml);
  const slugs = functionSlugs();

  it("finds the function tree (sanity)", () => {
    expect(slugs.length).toBeGreaterThan(10);
  });

  it("has a [functions.<slug>] entry for every function directory", () => {
    const missing = slugs.filter((s) => !entries.has(s));
    expect(missing, "add `[functions.<slug>]\\nverify_jwt = false` to supabase/config.toml").toEqual([]);
  });

  it("sets verify_jwt = false on every entry (authorization lives in _shared/access.ts)", () => {
    const wrong = [...entries].filter(([, v]) => v !== "false").map(([s, v]) => `${s}=${v}`);
    expect(wrong).toEqual([]);
  });

  it("has no entries for functions that no longer exist", () => {
    const stale = [...entries.keys()].filter((s) => !slugs.includes(s));
    expect(stale).toEqual([]);
  });
});

describe("every edge-function test file has a runner", () => {
  it("is either a native Deno.test file or a vitest file", () => {
    const orphans = (edgeTestFiles() as string[]).filter((f) => {
      const src = readFileSync(join(APP_ROOT, f), "utf8");
      return !isDenoTestSource(src) && !/from\s+["']vitest["']/.test(src);
    });
    expect(orphans).toEqual([]);
  });
});
