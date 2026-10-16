// Guard: the SPA homepage (index.html) must carry the same canonical/OG/Twitter
// treatment the generated static pages (guidebook chapters, benchmarks) get.
// Fails the prebuild if the root meta silently regresses.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "index.html"), "utf8");

const CANONICAL = "https://legal-marketing-hub.replit.app/";

const requirements = [
  ["descriptive <title>", /<title>[^<]{20,}<\/title>/],
  ["meta description (non-generic, 50+ chars)", /<meta name="description" content="[^"]{50,}"/],
  ["canonical link to production root", new RegExp(`<link rel="canonical" href="${CANONICAL}"`)],
  ["og:type", /<meta property="og:type" content="website"/],
  ["og:site_name", /<meta property="og:site_name" content="Uvid"/],
  ["og:title", /<meta property="og:title" content="[^"]{20,}"/],
  ["og:description", /<meta property="og:description" content="[^"]{50,}"/],
  ["og:url pointing at production root", new RegExp(`<meta property="og:url" content="${CANONICAL}"`)],
  ["twitter:card", /<meta name="twitter:card" content="summary_large_image"/],
  ["twitter:title", /<meta name="twitter:title" content="[^"]{20,}"/],
  ["twitter:description", /<meta name="twitter:description" content="[^"]{50,}"/],
];

const failures = requirements.filter(([, re]) => !re.test(html)).map(([label]) => label);

if (failures.length > 0) {
  console.error("ERROR: index.html root meta regressed. Missing/invalid:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`root-meta: index.html carries canonical/OG/Twitter meta (${requirements.length} checks passed)`);
