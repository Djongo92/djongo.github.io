import { describe, it, expect } from "vitest";
import { isLowConfidenceSample, LOW_SAMPLE_THRESHOLD } from "./confidenceBand";

describe("isLowConfidenceSample", () => {
  it("flags a sample below the threshold", () => {
    expect(isLowConfidenceSample(LOW_SAMPLE_THRESHOLD - 1)).toBe(true);
    expect(isLowConfidenceSample(0)).toBe(true);
  });

  it("does not flag a sample at or above the threshold", () => {
    expect(isLowConfidenceSample(LOW_SAMPLE_THRESHOLD)).toBe(false);
    expect(isLowConfidenceSample(LOW_SAMPLE_THRESHOLD + 10)).toBe(false);
  });
});
