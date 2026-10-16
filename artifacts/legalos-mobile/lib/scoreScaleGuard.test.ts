import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { findRawScaleLeaks, stripComments } from "./scoreScaleGuard";

// ---------------------------------------------------------------------------
// Detector fixtures — mirrors the web guard so both ports catch the same
// regression shapes (the mobile battle-plan slot was one of the originals).
// ---------------------------------------------------------------------------

describe("findRawScaleLeaks — catches the historical regressions", () => {
  it("flags a battle-plan-slot-style template with a raw denominator", () => {
    const bad = "const slot = `${plan.total_score}/200`;";
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags a mixed-scale rendered line", () => {
    const bad = `<Text>{audit.total_score} / 200 measured</Text>`;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags a hardcoded suffix string", () => {
    const bad = `const suffix = "/ 200";`;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags prose denominators like 'out of 200'", () => {
    const bad = `<Text>Your firm scored {score} out of 200 points</Text>`;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });
});

describe("findRawScaleLeaks — does not flag legitimate internal-scale code", () => {
  it("allows toScale500 rescale calls with a raw 200 max", () => {
    const good = `<Text>{toScale500(before.total_score, 200)}</Text>`;
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });

  it("allows percent arithmetic against the raw max", () => {
    const good = `const pct = Math.round((score / 200) * 100);`;
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });

  it("allows '/ 200' mentions inside comments", () => {
    const good = `
      // never hardcode "/ 200" — use scale500Suffix instead
      const label = measuredScoreLabel(score, totals);
    `;
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });

  it("allows the shared '/ 500' display suffix", () => {
    const good = 'return totals.isPartial ? "/ 500 measured" : "/ 500";';
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });
});

describe("stripComments", () => {
  it("keeps URLs inside strings intact", () => {
    const src = `const u = "https://example.com/200"; // trailing`;
    expect(stripComments(src)).toContain("https://example.com/200");
    expect(stripComments(src)).not.toContain("trailing");
  });
});

// ---------------------------------------------------------------------------
// The actual guard: sweep every non-test source file in the mobile app.
// ---------------------------------------------------------------------------

// Walk the whole artifact tree with explicit exclusions (generated,
// dependency, and test files) so a new source directory is covered by
// default instead of silently escaping the guard.
const EXCLUDED_DIRS = new Set(["node_modules", ".expo", "dist", "build", "coverage", ".git", "assets"]);

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry)) collectSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry)) continue;
    acc.push(full);
  }
  return acc;
}

describe("the score-history screen renders the 500 scale", () => {
  // Bare {firm.score}/{entry.score} are raw 0–200 values — the 2026-08-15
  // leak where this screen contradicted the 500-scale Score tab.
  const src = readFileSync(join(__dirname, "..", "app", "score-history.tsx"), "utf8");

  it("never renders a raw score value", () => {
    expect(src).not.toMatch(/\{firm\.score\}/);
    expect(src).not.toMatch(/\{entry\.score\}/);
  });

  it("scales the current-score stat via toScale500", () => {
    expect(src).toContain("toScale500(firm.score");
  });

  it("scales history points against each snapshot's frozen provenance", () => {
    expect(src).toContain("historyScore500(entry.score, entry.provenance, entry.methodologyVersion)");
  });

  it("plots the sparkline on the scaled values, not raw scores", () => {
    expect(src).toContain("historyScore500(d.score, d.provenance, d.methodologyVersion)");
    // The row diff is already the difference of scaled endpoints —
    // rescaling it again double-counts (a true +2 would render +5).
    expect(src).not.toContain("toScale500(diff");
  });
});

describe("mobile app source is free of raw 0–200 display leaks", () => {
  const root = join(__dirname, "..");
  const files = collectSourceFiles(root);

  it("finds a plausible number of source files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("covers every source directory, not just an allowlist", () => {
    for (const dir of ["app", "components", "lib", "hooks", "context", "constants"]) {
      expect(
        files.some((f) => f.startsWith(join(root, dir) + "/")),
        `expected the sweep to include files under ${dir}/`,
      ).toBe(true);
    }
  });

  it("would fail if a leak appeared in a hooks/context-style module", () => {
    // Integration-shaped proof: a label built in a non-rendering module
    // (hook/context/constants) is still caught by the same scanner the
    // sweep runs over those directories.
    const bad = `export function useScoreLabel(score: number) {
      return \`\${score} / 200\`;
    }`;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("renders no raw 200-scale denominators anywhere", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const leaks = findRawScaleLeaks(readFileSync(file, "utf8"));
      for (const leak of leaks) {
        offenders.push(`${file}:${leak.line} [${leak.rule}] ${leak.text}`);
      }
    }
    expect(
      offenders,
      `Raw 0–200 scale leaked into display copy — render totals via toScale500/measuredScoreLabel/scale500Suffix instead:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
