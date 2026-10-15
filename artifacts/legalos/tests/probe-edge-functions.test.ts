// Guards the probe script's static extraction: if a call site's slug can't
// be discovered, the live probe silently skips it and the whole "catch the
// next undeployed function" guarantee evaporates. These tests pin:
//   1. every KNOWN_UNDEPLOYED slug is actually discovered from src/ (a slug
//      the extractor can't see could never be probed or validated),
//   2. the naming convention for dynamic slug constants is honoured,
//   3. classification fails on dead-unlisted and live-but-listed slugs.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error — plain .mjs module without type declarations
import {
  extractSlugsFromSource,
  collectCalledSlugs,
  parseKnownUndeployed,
  classifyProbeResult,
} from "./probe-edge-functions.mjs";

const SRC = join(__dirname, "..", "src");
const availSource = readFileSync(join(SRC, "lib", "edgeFunctionAvailability.ts"), "utf8");

describe("probe-edge-functions extraction", () => {
  it("discovers every KNOWN_UNDEPLOYED slug from src call sites", () => {
    const called = collectCalledSlugs(SRC);
    const known = parseKnownUndeployed(availSource);
    // The set is legitimately empty when everything called is deployed —
    // the invariant is that a LISTED slug must be extractable (a typo'd
    // entry would silently exempt a live call site from the probe).
    for (const slug of known) {
      expect(called, `KNOWN_UNDEPLOYED slug "${slug}" not found by the extractor — its call site would never be probed`).toContain(slug);
    }
  });

  it("discovers the six formerly-guarded call sites specifically", () => {
    const called = collectCalledSlugs(SRC);
    for (const slug of [
      "audit-snapshot-save",
      "firm-members-manage",
      "visibility-audit-dispute",
      "workflow-items-manage",
      "workflow-comment-add",
      "workflow-partner-link",
    ]) {
      expect(called).toContain(slug);
    }
  });

  it("extracts slugs from all three source patterns", () => {
    const slugs = extractSlugsFromSource(`
      fetch(\`\${SUPABASE_URL}/functions/v1/literal-slug\`);
      const url = fnUrl("workshop-slug");
      const FUNCTION_NAME = "dynamic-slug";
      const ITEMS_FN = "suffix-fn-slug";
    `);
    expect([...slugs].sort()).toEqual([
      "dynamic-slug", "literal-slug", "suffix-fn-slug", "workshop-slug",
    ]);
  });
});

describe("probe-edge-functions classification", () => {
  const known = new Set(["dead-listed"]);

  it("fails a 404 slug missing from KNOWN_UNDEPLOYED", () => {
    expect(classifyProbeResult("dead-unlisted", 404, known).ok).toBe(false);
  });

  it("fails a live slug still listed in KNOWN_UNDEPLOYED", () => {
    expect(classifyProbeResult("dead-listed", 401, known).ok).toBe(false);
  });

  it("passes a listed 404 and an unlisted live slug", () => {
    expect(classifyProbeResult("dead-listed", 404, known).ok).toBe(true);
    expect(classifyProbeResult("live-fn", 400, known).ok).toBe(true);
    expect(classifyProbeResult("live-fn", 200, known).ok).toBe(true);
  });

  it("fails on network errors", () => {
    expect(classifyProbeResult("any", null, known).ok).toBe(false);
  });
});
