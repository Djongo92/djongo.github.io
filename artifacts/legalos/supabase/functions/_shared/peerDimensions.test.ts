import { describe, it, expect } from "vitest";
import { parsePeerRefinement } from "./peerDimensions";

describe("parsePeerRefinement", () => {
  it("passes through valid enum values", () => {
    const result = parsePeerRefinement({ firmSize: "boutique_2_10", officeCount: "multi", serviceModel: "full_service", marketTier: "tier1" });
    expect(result.firmSize).toBe("boutique_2_10");
    expect(result.officeCount).toBe("multi");
    expect(result.serviceModel).toBe("full_service");
    expect(result.marketTier).toBe("tier1");
  });

  it("nulls out invalid or missing values rather than erroring", () => {
    const result = parsePeerRefinement({ firmSize: "not-a-real-size", officeCount: undefined });
    expect(result.firmSize).toBeNull();
    expect(result.officeCount).toBeNull();
    expect(result.serviceModel).toBeNull();
    expect(result.marketTier).toBeNull();
  });

  it("trims and length-caps free-text specialization", () => {
    const result = parsePeerRefinement({ specialization: "  Corporate/M&A  " });
    expect(result.specialization).toBe("Corporate/M&A");
  });

  it("nulls out an empty specialization string", () => {
    const result = parsePeerRefinement({ specialization: "   " });
    expect(result.specialization).toBeNull();
  });

  it("ignores non-string input for every field without throwing", () => {
    const result = parsePeerRefinement({ firmSize: 123, officeCount: {}, specialization: 456 });
    expect(result.firmSize).toBeNull();
    expect(result.officeCount).toBeNull();
    expect(result.specialization).toBeNull();
  });
});
