import { describe, it, expect } from "vitest";
import { applyToAllSlides } from "./deckApplyFixes";

describe("applyToAllSlides", () => {
  it("returns no failures when every slide regenerates", async () => {
    expect(await applyToAllSlides(3, async () => true)).toEqual([]);
  });

  it("attempts every slide even after a failure and reports the failed indices", async () => {
    const attempted: number[] = [];
    const failed = await applyToAllSlides(4, async (i) => {
      attempted.push(i);
      return i !== 1 && i !== 3; // slides 2 and 4 fail
    });
    expect(attempted).toEqual([0, 1, 2, 3]); // no early exit
    expect(failed).toEqual([1, 3]);
  });

  it("a zero-slide deck is a no-op success", async () => {
    expect(await applyToAllSlides(0, async () => false)).toEqual([]);
  });
});
