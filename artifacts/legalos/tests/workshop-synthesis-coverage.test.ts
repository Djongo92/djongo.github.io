// Static guard: every Workshop tool that records a run must pass an
// `output` field, because post-run synthesis (queueRunSynthesis, fired from
// recordRun) silently skips runs without one. Added after the Marketing
// Calendar tool shipped a recordRun without output — its runs never
// produced synthesis notes, so the firm's profile never learned from them.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SRC = join(__dirname, "../src");

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) yield* sourceFiles(p);
    else if (/\.tsx?$/.test(name.name) && !name.name.includes(".test.")) yield p;
  }
}

/** Extract the text of each recordRun({ ... }) call (balanced braces). */
function recordRunBlocks(src: string): string[] {
  const blocks: string[] = [];
  let idx = 0;
  while ((idx = src.indexOf("recordRun({", idx)) !== -1) {
    let depth = 0;
    let end = idx;
    for (let i = idx + "recordRun(".length; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    blocks.push(src.slice(idx, end));
    idx = end;
  }
  return blocks;
}

describe("workshop synthesis coverage", () => {
  it("every recordRun call includes an output field so synthesis can learn from the run", () => {
    const violations: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const src = readFileSync(file, "utf8");
      for (const block of recordRunBlocks(src)) {
        // Accept both `output: value` and the `output,` shorthand.
        if (!/\boutput\s*[:,]/.test(block)) {
          violations.push(`${file.split("/src/")[1]}: recordRun without output`);
        }
      }
    }
    expect(
      violations,
      `recordRun calls missing output (synthesis will skip these runs):\n${violations.join("\n")}\n\nFix: pass a bounded textual form of the tool's result as output (see MarketingCalendar.tsx).`,
    ).toEqual([]);
  });
});
