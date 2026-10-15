// Task #215 — brand-palette drift guard for the static pages.
//
// The marketing site went from cold navy (hsl 222…) to warm near-black
// (hsl 30…); the 24 hand-written static pages under public/ silently stayed
// cold until a one-off swap fixed them. Nothing prevented a repeat — this
// check is the prevention:
//
//   1. Every public/**/*.html page must be free of the retired cold-navy
//      tokens AND must carry the shared warm background token (a page that
//      loses it has drifted off-palette even without the old tokens).
//   2. The generator TEMPLATES are scanned too — the guidebook and
//      benchmarks HTML are regenerated from guidebookPageRender.mjs and
//      generate-benchmarks.mjs, so drift at the template layer reverts every
//      page on the next generation run (this is how the drift would return).
//
// Run: pnpm --filter @workspace/uvid-marketing run check:palette
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The retired cold-navy family — any hsl() whose hue is 222 is the old brand.
const RETIRED = /\bhsl\(\s*222[\s)]/;
// The shared warm background every static page renders on.
const REQUIRED_WARM = "hsl(30 28% 5%)";

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith(".html")) yield p;
  }
}

// Emitted HTML is disposable; these templates are where drift would re-enter.
const TEMPLATES = [
  join(ROOT, "scripts", "generate-benchmarks.mjs"),
  join(ROOT, "..", "legalos", "scripts", "guidebookPageRender.mjs"),
];

const problems = [];

for (const file of htmlFiles(join(ROOT, "public"))) {
  const src = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length + 1);
  if (RETIRED.test(src)) problems.push(`${rel}: contains a retired cold-navy token (hsl(222 …))`);
  if (!src.includes(REQUIRED_WARM)) problems.push(`${rel}: missing the warm background token (${REQUIRED_WARM})`);
}

for (const file of TEMPLATES) {
  const src = readFileSync(file, "utf8");
  if (RETIRED.test(src)) {
    problems.push(`${file.slice(join(ROOT, "..").length + 1)}: generator template contains a retired cold-navy token — regenerating would revert every emitted page`);
  }
}

if (problems.length > 0) {
  console.error("palette drift check FAILED:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`palette check: static pages + generator templates are on the warm palette`);
