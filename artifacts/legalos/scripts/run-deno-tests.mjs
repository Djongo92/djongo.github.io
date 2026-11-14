// `pnpm run test:deno` — runs every native Deno.test file under
// supabase/functions (discovered, not listed by hand; see denoTestFiles.mjs).
import { spawnSync } from "node:child_process";
import { APP_ROOT, denoTestFiles } from "./denoTestFiles.mjs";

const files = denoTestFiles();
if (files.length === 0) {
  console.error("run-deno-tests: no Deno.test files found under supabase/functions — refusing to report success.");
  process.exit(1);
}
console.log(`run-deno-tests: ${files.length} file(s)`);
const result = spawnSync("deno", ["test", "--allow-env", ...files, ...process.argv.slice(2)], {
  cwd: APP_ROOT,
  stdio: "inherit",
});
if (result.error) {
  console.error(`run-deno-tests: could not start deno (${result.error.message}). Install it: https://deno.com`);
  process.exit(1);
}
process.exit(result.status ?? 1);
