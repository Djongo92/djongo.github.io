import { describe, it, expect } from "vitest";
import { homepageVariants } from "./hostVariants";

describe("homepageVariants", () => {
  it("adds the www variant for a bare host", () => {
    expect(homepageVariants("https://firm.rs")).toEqual(["https://firm.rs", "https://www.firm.rs"]);
  });

  it("adds the bare variant for a www host", () => {
    expect(homepageVariants("https://www.firm.rs")).toEqual(["https://www.firm.rs", "https://firm.rs"]);
  });

  it("does not duplicate when the original is tried first", () => {
    const variants = homepageVariants("https://firm.rs");
    expect(new Set(variants).size).toBe(variants.length);
  });
});
