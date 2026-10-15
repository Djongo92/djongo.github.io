import { describe, expect, it } from "vitest";
import { selectDashboardAudit } from "./dashboardAuditSelection";

const row = (id: string, provenance: Record<string, string>, total_score: number) => ({
  id,
  audited_domain: "ikonicstikovic.rs",
  market: "serbia",
  updated_at: "2026-08-20T00:00:00Z",
  provenance,
  total_score,
});

describe("selectDashboardAudit", () => {
  it("uses the published census row when it has fuller coverage for the same domain", () => {
    const privateRow = row("private", {
      performance: "measured", social: "measured", thoughtLeadership: "measured",
      seoAuthority: "missing", reputation: "missing",
    }, 156);
    const censusRow = row("census", {
      performance: "measured", social: "measured", thoughtLeadership: "measured",
      seoAuthority: "measured", reputation: "measured",
    }, 64.1);

    const selected = selectDashboardAudit(privateRow, [censusRow]);

    expect(selected.id).toBe("census");
    expect(selected.total_score).toBe(64.1);
    expect(selected.dashboard_source).toBe("public_census");
  });

  it("does not replace a fuller private row with a sparser published row", () => {
    const privateRow = row("private", {
      performance: "measured", social: "measured", seoAuthority: "measured",
      thoughtLeadership: "measured", reputation: "measured",
    }, 120);
    const censusRow = row("census", {
      performance: "measured", social: "measured", seoAuthority: "missing",
      thoughtLeadership: "measured", reputation: "missing",
    }, 70);

    const selected = selectDashboardAudit(privateRow, [censusRow]);

    expect(selected.id).toBe("private");
    expect(selected.dashboard_source).toBe("private");
    expect(selected.public_audit_available).toBe(true);
  });
});