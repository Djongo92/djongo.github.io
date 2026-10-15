// Pure Performance category math (20 pts): no Deno globals, no network, no
// cache — kept separate from performanceScore.ts so it's importable from a
// plain Vitest/Node test without transitively pulling in cache.ts's
// top-level Deno.env.get() calls.
// 10×(desktop+mobile perf avg)/100 + 5×(access avg)/100 + 5×(seo avg)/100.
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

  const score = Math.round((10 * (perfAvg / 100) + 5 * (accessAvg / 100) + 5 * (seoAvg / 100)) * 100) / 100;

  return { score, perfAvg, accessAvg, seoAvg };
}
