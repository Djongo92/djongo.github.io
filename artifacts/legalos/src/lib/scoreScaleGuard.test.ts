import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { findRawScaleLeaks, stripComments } from "./scoreScaleGuard";

// ---------------------------------------------------------------------------
// Detector fixtures — one bad snippet per historical regression, so the
// scanner is proven to catch each shape that review previously had to find.
// ---------------------------------------------------------------------------

describe("findRawScaleLeaks — catches the historical regressions", () => {
  it("flags a Command Center-style partial-audit note with a raw denominator", () => {
    const bad = `
      const note = \`Partial audit: \${audit.total_score} / 200 measured so far\`;
    `;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags a What-If-style mixed-scale JSX line", () => {
    const bad = `
      <p className="text-sm">{whatIfScore} / 200 projected</p>
    `;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags a share-card-style suffix string", () => {
    const bad = `ctx.fillText("/ 200", x, y);`;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags a mobile battle-plan-slot-style template", () => {
    const bad = "const slot = `${plan.total_score}/200`;";
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags prose denominators like 'out of 200'", () => {
    const bad = `<Text>Your firm scored {score} out of 200 points</Text>`;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags a chart axis bounded to the raw 0–200 scale", () => {
    const bad = `<YAxis domain={[0, 200]} tick={{ fontSize: 11 }} />`;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });

  it("flags plain JSX text ending in a raw denominator", () => {
    const bad = `<span>Score / 200</span>`;
    expect(findRawScaleLeaks(bad)).not.toHaveLength(0);
  });
});

describe("findRawScaleLeaks — does not flag legitimate internal-scale code", () => {
  it("allows toScale500 rescale calls with a raw 200 max", () => {
    const good = `<p>{toScale500(before.total_score, 200)}</p>`;
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });

  it("allows percent arithmetic against the raw max", () => {
    const good = `const pct = Math.round((r.score / 200) * 100);`;
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });

  it("allows '/ 200' mentions inside comments", () => {
    const good = `
      // never hardcode "/ 200" — use scale500Suffix instead
      /* an 80/200 firm reads as 40% */
      const label = measuredScoreLabel(score, totals);
    `;
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });

  it("allows template interpolation that divides by a conditional 200 max", () => {
    const good =
      "const dash = `${(total / (t.isPartial ? t.measuredMax : 200)) * 276.4} 276.4`;";
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });

  it("allows the shared '/ 500' display suffix", () => {
    const good = 'return totals.isPartial ? "/ 500 measured" : "/ 500";';
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });

  it("does not misread 2000+ numbers as the 200 scale", () => {
    const good = `const wait = "retry / 2000ms";`;
    expect(findRawScaleLeaks(good)).toHaveLength(0);
  });
});

describe("stripComments", () => {
  it("keeps URLs inside strings intact", () => {
    const src = `const u = "https://example.com/200"; // trailing`;
    expect(stripComments(src)).toContain("https://example.com/200");
    expect(stripComments(src)).not.toContain("trailing");
  });

  it("preserves line numbers across block comments", () => {
    const src = "a\n/* x\ny */\nb";
    expect(stripComments(src).split("\n")).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// The actual guard: sweep every non-test source file in the web app.
// ---------------------------------------------------------------------------

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry)) continue;
    acc.push(full);
  }
  return acc;
}

describe("the Command Center trend chart renders the 500 scale", () => {
  const src = readFileSync(join(__dirname, "..", "components", "dashboard", "CommandCenter.tsx"), "utf8");

  it("plots the pre-scaled score500 series", () => {
    expect(src).toContain('dataKey="score500"');
  });

  it("bounds its axis to the 500 display scale", () => {
    expect(src).toContain("domain={[0, 500]}");
    expect(src).not.toContain("domain={[0, 200]}");
  });

  it("derives the 'since first audit' delta from the scaled endpoints (raw-point deltas contradict the chart)", () => {
    expect(src).toContain("{scoreDelta500} since first audit");
    expect(src).not.toMatch(/\{scoreDelta\}\s*since/);
    expect(src).not.toContain("toScale500(scoreDelta");
  });

  it("compares personal bests on the scaled series (a raw rise over a denominator change must not celebrate)", () => {
    expect(src).toContain("map((t) => t.score500)");
    expect(src).toContain("trend[trend.length - 1].score500 > priorMax");
  });
});

describe("web app source is free of raw 0–200 display leaks", () => {
  const srcRoot = join(__dirname, "..");
  const files = collectSourceFiles(srcRoot);

  it("finds a plausible number of source files", () => {
    expect(files.length).toBeGreaterThan(50);
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
