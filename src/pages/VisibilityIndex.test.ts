import { describe, it, expect } from "vitest";
import { measuredPercentage, type AuditRow } from "./VisibilityIndex";

const baseRow: AuditRow = {
  audited_domain: "example.com",
  display_name: "Example Firm",
  peer_group: "local",
  total_score: 80,
  published_at: null,
  verified_at: null,
};

describe("measuredPercentage", () => {
  it("falls back to total_score/200 for demo rows with no provenance", () => {
    expect(measuredPercentage({ ...baseRow, total_score: 80 })).toBe(40);
  });

  it("uses the measured-categories-only denominator for real rows", () => {
    // SEO & Authority (60 pts) is unmeasured — the fair denominator is
    // 140 (200 - 60), not the full 200, so 80/140 reads as 57%, not 40%.
    const row: AuditRow = {
      ...baseRow,
      performance_score: 15,
      social_score: 15,
      seo_authority_score: 0,
      thought_leadership_score: 25,
      reputation_score: 25,
      provenance: {
        performance: "api",
        social: "self_reported",
        seoAuthority: "missing",
        thoughtLeadership: "ai_classified",
        reputation: "api",
      },
    };
    expect(measuredPercentage(row)).toBe(Math.round(((15 + 15 + 25 + 25) / 140) * 100));
  });

  it("returns 0 when every category is missing rather than dividing by zero", () => {
    const row: AuditRow = {
      ...baseRow,
      performance_score: 0,
      social_score: 0,
      seo_authority_score: 0,
      thought_leadership_score: 0,
      reputation_score: 0,
      provenance: {
        performance: "missing",
        social: "missing",
        seoAuthority: "missing",
        thoughtLeadership: "missing",
        reputation: "missing",
      },
    };
    expect(measuredPercentage(row)).toBe(0);
  });

  it("reads 100% for a fully-measured, maxed-out score", () => {
    const row: AuditRow = {
      ...baseRow,
      performance_score: 20,
      social_score: 20,
      seo_authority_score: 60,
      thought_leadership_score: 45,
      reputation_score: 55,
      provenance: {
        performance: "api",
        social: "self_reported",
        seoAuthority: "api",
        thoughtLeadership: "ai_classified",
        reputation: "api",
      },
    };
    expect(measuredPercentage(row)).toBe(100);
  });
});
