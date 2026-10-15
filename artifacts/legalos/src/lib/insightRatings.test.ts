import { describe, it, expect } from "vitest";
import { nextInsightRating, applyRating } from "./insightRatings";

describe("nextInsightRating", () => {
  it("sets a rating on an unrated card", () => {
    expect(nextInsightRating(undefined, "useful")).toBe("useful");
    expect(nextInsightRating(undefined, "not_useful")).toBe("not_useful");
  });

  it("clears when the active rating is clicked again", () => {
    expect(nextInsightRating("useful", "useful")).toBeNull();
    expect(nextInsightRating("not_useful", "not_useful")).toBeNull();
  });

  it("switches when the opposite rating is clicked", () => {
    expect(nextInsightRating("useful", "not_useful")).toBe("not_useful");
    expect(nextInsightRating("not_useful", "useful")).toBe("useful");
  });
});

describe("applyRating", () => {
  it("sets and switches entries without mutating the input", () => {
    const before = { a: "useful" as const };
    const after = applyRating(before, "a", "not_useful");
    expect(after).toEqual({ a: "not_useful" });
    expect(before).toEqual({ a: "useful" });
  });

  it("removes the entry when next is null", () => {
    expect(applyRating({ a: "useful", b: "not_useful" }, "a", null)).toEqual({ b: "not_useful" });
  });
});
