// Static guard for the task-#136 review findings: both bearer-link functions
// must mint links through the shared fail-closed role gate, and must not wrap
// the gate in a conditional that a transient auth error can skip (that fail-
// open shape is exactly what the reviewer caught twice). Edge functions are
// Deno and can't run under vitest, so this pins the wiring by source.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// vitest runs from the artifact root, so cwd-relative paths are stable.
const read = (slug: string) =>
  readFileSync(`supabase/functions/${slug}/index.ts`, "utf8");

describe("bearer-link role-gate wiring", () => {
  for (const slug of ["roast-share-link", "workflow-partner-link"]) {
    it(`${slug} uses the shared scoped gate`, () => {
      const src = read(slug);
      expect(src).toContain('from "../_shared/firmRoleGate.ts"');
      expect(src).toContain("resolveLinkManagerRole(");
    });

    it(`${slug} never gates conditionally on the getUser result (fail-open trap)`, () => {
      const src = read(slug);
      // The forbidden shape: the role check nested inside if (userData?.user).
      expect(src).not.toMatch(/if\s*\(userData\?\.user\)\s*\{[^}]*resolveLinkManagerRole/s);
    });
  }
});
