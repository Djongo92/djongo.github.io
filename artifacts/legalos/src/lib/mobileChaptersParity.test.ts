// The web guidebook is the single source of truth; the mobile app's
// data/chapters.ts is a generated projection of it (scripts/generate-mobile-
// chapters.mjs). If the web book changes and the mobile file is not
// regenerated, this test fails — the two ports can never drift again.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chapters } from "@/data/chapters";
import { projectMobileChapters, MOBILE_HEADER } from "./mobileChapterProjection";

// vitest runs with cwd = artifacts/legalos; import.meta.url is unreliable here
// (vite rewrites it to a non-file scheme), so resolve from cwd.
const MOBILE_FILE = resolve(process.cwd(), "../legalos-mobile/data/chapters.ts");

describe("mobile guidebook parity", () => {
  it("mobile data/chapters.ts is byte-identical to the generated projection", () => {
    const committed = readFileSync(MOBILE_FILE, "utf8");
    expect(committed).toBe(projectMobileChapters(chapters));
  });

  it("the committed file carries the GENERATED header", () => {
    const committed = readFileSync(MOBILE_FILE, "utf8");
    expect(committed.startsWith(MOBILE_HEADER)).toBe(true);
  });

  it("projects all 21 chapters with their rubric materials folded in", () => {
    const projected = projectMobileChapters(chapters);
    expect((projected.match(/^    id: '/gm) ?? []).length).toBe(chapters.length);
    expect(projected).toContain("Materials — ");
    expect(projected).toContain("Proof it worked");
  });
});
