/**
 * Static guard against the retired 0–200 score scale (methodology v1–v2)
 * leaking into user-facing copy. Scores are native on 500 since v3, and
 * every rendered total goes through measuredScoreLabel/scale500Suffix
 * (see measuredScore.ts). Two review rounds kept catching surfaces that
 * hardcoded a "/ 200"-style denominator next to a raw total_score (Command
 * Center partial note, What-If comparison, Before/After, mobile battle-plan
 * slot, marketing hero ring) — this scanner fails CI on the next one.
 *
 * It is a heuristic, not a parser: comments are stripped (string-aware, so
 * "https://" survives), then rendered-text contexts are checked for a raw
 * 200 denominator. Arithmetic like `(score / 200) * 100` and rescale calls
 * like `toScale500(x, 200)` are intentionally NOT flagged — they are code,
 * not display copy.
 */

export interface ScaleLeak {
  line: number;
  text: string;
  rule: string;
}

/**
 * Removes // and /* *\/ comments without touching string or template-literal
 * contents (so "https://…" is safe). Template interpolations `${…}` are
 * treated as code, so JSDoc-style comments inside them are also stripped.
 */
export function stripComments(source: string): string {
  let out = "";
  type State = "code" | "line" | "block" | "single" | "double" | "template";
  const stack: State[] = ["code"];
  // brace depth inside a template interpolation, per template nesting level
  const interpDepth: number[] = [];
  let i = 0;
  while (i < source.length) {
    const state = stack[stack.length - 1];
    const c = source[i];
    const next = source[i + 1];
    if (state === "line") {
      if (c === "\n") {
        stack.pop();
        out += c;
      }
      i++;
      continue;
    }
    if (state === "block") {
      if (c === "*" && next === "/") {
        stack.pop();
        i += 2;
      } else {
        if (c === "\n") out += c; // keep line numbers stable
        i++;
      }
      continue;
    }
    if (state === "single" || state === "double") {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if ((state === "single" && c === "'") || (state === "double" && c === '"') || c === "\n") {
        stack.pop();
      }
      i++;
      continue;
    }
    if (state === "template") {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (c === "`") {
        stack.pop();
        i++;
        continue;
      }
      if (c === "$" && next === "{") {
        out += next;
        stack.push("code");
        interpDepth.push(0);
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    // state === "code"
    if (c === "/" && next === "/") {
      stack.push("line");
      i += 2;
      continue;
    }
    if (c === "/" && next === "*") {
      stack.push("block");
      i += 2;
      continue;
    }
    if (c === "'") {
      out += c;
      stack.push("single");
      i++;
      continue;
    }
    if (c === '"') {
      out += c;
      stack.push("double");
      i++;
      continue;
    }
    if (c === "`") {
      out += c;
      stack.push("template");
      i++;
      continue;
    }
    if (interpDepth.length > 0) {
      if (c === "{") interpDepth[interpDepth.length - 1]++;
      if (c === "}") {
        if (interpDepth[interpDepth.length - 1] === 0) {
          // end of ${…} interpolation — back to the template literal
          out += c;
          stack.pop();
          interpDepth.pop();
          i++;
          continue;
        }
        interpDepth[interpDepth.length - 1]--;
      }
    }
    out += c;
    i++;
    continue;
  }
  return out;
}

interface Rule {
  name: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    // A "/ 200" denominator inside a string or template literal on the same
    // line: `${score} / 200`, "Score / 200", '… /200 …'.
    name: "raw-200-denominator-in-string",
    pattern: /["'`][^"'`\n]*\/\s*200(?!\d)/,
  },
  {
    // A rendered JSX expression followed by a raw denominator: {total} / 200.
    name: "raw-200-denominator-after-jsx-expression",
    pattern: /\}\s*\/\s*200(?!\d)/,
  },
  {
    // Plain JSX text ending in a raw denominator: >… / 200<.
    name: "raw-200-denominator-in-jsx-text",
    pattern: /\/\s*200\s*</,
  },
  {
    // Prose denominators: "out of 200", "of 200 points".
    name: "raw-200-prose-denominator",
    pattern: /\b(?:out\s+of|of)\s+200(?!\d)/i,
  },
  {
    // A chart axis bounded to the raw scale — the ticks themselves display
    // 0–200 values: <YAxis domain={[0, 200]} />. (The 2026-08-15 regression:
    // the Command Center trend chart plotted raw totals against this axis
    // while its tooltip showed the 500 scale.)
    name: "raw-200-axis-domain",
    pattern: /domain=\{\[\s*0\s*,\s*200\s*\]\}/,
  },
];

/**
 * Scans one file's source and returns every line that renders a raw
 * 0–200-scale denominator. Empty array means the file is clean.
 */
export function findRawScaleLeaks(source: string): ScaleLeak[] {
  const stripped = stripComments(source);
  const leaks: ScaleLeak[] = [];
  const lines = stripped.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        leaks.push({ line: idx + 1, text: line.trim(), rule: rule.name });
        break;
      }
    }
  }
  return leaks;
}
