// Pure Website Experience category math (50 pts — weights in methodology.ts):
// no Deno globals, no network, no cache — kept separate from
// performanceScore.ts so it's importable from a plain Vitest/Node test
// without transitively pulling in cache.ts's top-level Deno.env.get() calls.
// Each PageSpeed category (desktop+mobile averaged, 0–100) is a 0–1 signal.
import { PERFORMANCE_WEIGHTS as W, round2 } from "./methodology.ts";

export interface LighthouseCategories {
  performance: number;
  accessibility: number;
  seo: number;
}

export interface PerformanceCalculation {
  score: number;
  perfAvg: number;
  accessAvg: number;
  seoAvg: number;
}

export function calculatePerformanceScore(desktop: LighthouseCategories, mobile: LighthouseCategories): PerformanceCalculation {
  const perfAvg = (desktop.performance + mobile.performance) / 2;
  const accessAvg = (desktop.accessibility + mobile.accessibility) / 2;
  const seoAvg = (desktop.seo + mobile.seo) / 2;

  const score = round2(W.speed * (perfAvg / 100) + W.accessibility * (accessAvg / 100) + W.technicalSeo * (seoAvg / 100));

  return { score, perfAvg, accessAvg, seoAvg };
}
