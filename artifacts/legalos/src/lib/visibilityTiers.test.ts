import { describe, it, expect } from "vitest";
import { visibilityTierFor } from "./visibilityTiers";

describe("visibilityTierFor", () => {
  it("bands a strong score as highly_visible", () => {
    expect(visibilityTierFor(85)).toBe("highly_visible");
    expect(visibilityTierFor(70)).toBe("highly_visible");
  });

  it("bands a middling score as visible", () => {
    expect(visibilityTierFor(55)).toBe("visible");
    expect(visibilityTierFor(40)).toBe("visible");
  });

  it("bands a thin score as emerging", () => {
    expect(visibilityTierFor(25)).toBe("emerging");
    expect(visibilityTierFor(15)).toBe("emerging");
  });

  it("bands a near-zero score as not_yet_visible", () => {
    expect(visibilityTierFor(5)).toBe("not_yet_visible");
    expect(visibilityTierFor(0)).toBe("not_yet_visible");
  });

  it("has no gaps or overlaps at the boundaries", () => {
    expect(visibilityTierFor(69.9)).toBe("visible");
    expect(visibilityTierFor(39.9)).toBe("emerging");
    expect(visibilityTierFor(14.9)).toBe("not_yet_visible");
  });
});
