import { describe, it, expect } from "vitest";
import { computeWeekRange, formatWeekRangeLabel } from "./mondayBriefWeek";

describe("computeWeekRange", () => {
  it("spans a full Monday-Sunday week even when today IS Monday (defect 1.4)", () => {
    // 2026-07-27 is a Monday.
    const monday = new Date("2026-07-27T10:00:00");
    const { monday: rangeStart, sunday: rangeEnd } = computeWeekRange(monday);
    expect(rangeStart.getDate()).toBe(27);
    expect(rangeEnd.getDate()).toBe(2); // Aug 2
    expect(rangeEnd.getMonth()).toBe(7); // August (0-indexed)
    expect(rangeStart.getTime()).not.toBe(rangeEnd.getTime());
  });

  it("resolves back to the same Monday/Sunday from any day mid-week", () => {
    // 2026-07-30 is a Thursday in the same week as the Monday above.
    const thursday = new Date("2026-07-30T10:00:00");
    const { monday, sunday } = computeWeekRange(thursday);
    expect(monday.getDate()).toBe(27);
    expect(monday.getMonth()).toBe(6); // July
    expect(sunday.getDate()).toBe(2);
    expect(sunday.getMonth()).toBe(7); // August
  });

  it("formats a label with distinct start and end dates", () => {
    const label = formatWeekRangeLabel(new Date("2026-07-27T10:00:00"));
    const [start, end] = label.split(" – ");
    expect(start).not.toBe(end);
  });
});
