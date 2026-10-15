import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/**/*.test.ts",
      "supabase/functions/_shared/**/*.test.ts",
      "supabase/functions/firm-signals-refresh/**/*.test.ts",
      "supabase/functions/workflow-items-manage/**/*.test.ts",
    ],
    exclude: [
      // These test files transitively import from https://esm.sh/ URLs (Deno/supabase-js),
      // which the Node.js ESM loader cannot resolve. They are tested in the Deno environment.
      "supabase/functions/_shared/reputationScore.test.ts",
      "supabase/functions/_shared/runVisibilityAudit.test.ts",
      "supabase/functions/_shared/peerStatsProvenance.test.ts",
      "supabase/functions/_shared/directoryStandingIndex.test.ts",
      "supabase/functions/_shared/peerStats.test.ts",
      "supabase/functions/_shared/performanceScore.test.ts",
      "supabase/functions/_shared/psiFetchWithFallback.test.ts",
      "supabase/functions/_shared/dashboardAuditSelection.test.ts",
      // cronAlert reads Deno.env / uses Deno.test — Deno-only (test:deno).
      "supabase/functions/_shared/cronAlert.test.ts",
      "supabase/functions/firm-signals-refresh/psiSignalRefresh.test.ts",
      "supabase/functions/firm-signals-refresh/sweepRunner.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
