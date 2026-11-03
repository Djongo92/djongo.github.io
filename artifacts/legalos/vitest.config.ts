import path from "path";
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { denoTestFiles } from "./scripts/denoTestFiles.mjs";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/**/*.test.ts",
      // Every edge-function test; the native Deno ones are excluded below.
      "supabase/functions/**/*.test.ts",
    ],
    exclude: [
      ...configDefaults.exclude,
      // Native Deno.test files (std assert from deno.land, Deno globals) run
      // under `test:deno`, not vitest. Derived from file contents — never list
      // a vitest-style test here: esm.sh supabase-js is aliased below so it
      // can run under vitest, and excluding it leaves it with no runner.
      ...denoTestFiles(),
    ],
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      // Edge modules import supabase-js from esm.sh (Deno). Node's ESM loader
      // can't fetch https: URLs, so map any pinned version to the npm package
      // the app already ships — this lets pure-logic tests of those modules
      // run under vitest instead of being excluded with no runner at all.
      { find: /^https:\/\/esm\.sh\/@supabase\/supabase-js@[^/]+$/, replacement: "@supabase/supabase-js" },
    ],
  },
});
