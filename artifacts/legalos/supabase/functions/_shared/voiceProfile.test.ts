import { describe, expect, it } from "vitest";
import { shouldRebuild, MIN_EXAMPLES, REBUILD_EVERY } from "./voiceProfile";

describe("shouldRebuild", () => {
  it("waits until there is enough signal", () => {
    expect(shouldRebuild(MIN_EXAMPLES - 1, null)).toBe(false);
    expect(shouldRebuild(MIN_EXAMPLES, null)).toBe(true);
  });
  it("rebuilds only after enough new examples since the last build", () => {
    expect(shouldRebuild(10, 10)).toBe(false);
    expect(shouldRebuild(10 + REBUILD_EVERY - 1, 10)).toBe(false);
    expect(shouldRebuild(10 + REBUILD_EVERY, 10)).toBe(true);
  });
});
