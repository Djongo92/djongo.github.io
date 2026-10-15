import { describe, it, expect } from "vitest";
import { calculatePerformanceScore } from "./performanceFormula";

describe("calculatePerformanceScore", () => {
  it("scores a perfect result at the full 20 points", () => {
    const perfect = { performance: 100, accessibility: 100, seo: 100 };
    const { score } = calculatePerformanceScore(perfect, perfect);
    expect(score).toBe(20);
  });

  it("scores a zero result at 0 points", () => {
    const zero = { performance: 0, accessibility: 0, seo: 0 };
    const { score } = calculatePerformanceScore(zero, zero);
    expect(score).toBe(0);
  });

  it("weights performance 10, accessibility 5, seo 5", () => {
    // Only performance maxed: 10 * 1 + 5*0 + 5*0 = 10
    const onlyPerf = { performance: 100, accessibility: 0, seo: 0 };
    const zero = { performance: 0, accessibility: 0, seo: 0 };
    expect(calculatePerformanceScore(onlyPerf, zero).score).toBeCloseTo(5, 5); // averaged across desktop+mobile: (100+0)/2=50 -> 10*0.5=5

    const bothPerf = { performance: 100, accessibility: 0, seo: 0 };
    expect(calculatePerformanceScore(bothPerf, bothPerf).score).toBeCloseTo(10, 5);

    const bothAccess = { performance: 0, accessibility: 100, seo: 0 };
    expect(calculatePerformanceScore(bothAccess, bothAccess).score).toBeCloseTo(5, 5);

    const bothSeo = { performance: 0, accessibility: 0, seo: 100 };
    expect(calculatePerformanceScore(bothSeo, bothSeo).score).toBeCloseTo(5, 5);
  });

  it("averages desktop and mobile independently per sub-metric", () => {
    const desktop = { performance: 80, accessibility: 90, seo: 100 };
    const mobile = { performance: 40, accessibility: 50, seo: 60 };
    const result = calculatePerformanceScore(desktop, mobile);
    expect(result.perfAvg).toBe(60);
    expect(result.accessAvg).toBe(70);
    expect(result.seoAvg).toBe(80);
    // 10*(60/100) + 5*(70/100) + 5*(80/100) = 6 + 3.5 + 4 = 13.5
    expect(result.score).toBeCloseTo(13.5, 5);
  });

  it("never exceeds the 20-point ceiling for in-range inputs", () => {
    const perfect = { performance: 100, accessibility: 100, seo: 100 };
    expect(calculatePerformanceScore(perfect, perfect).score).toBeLessThanOrEqual(20);
  });
});
