import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { selectDashboardAudit } from "./dashboardAuditSelection.ts";

const row = (id: string, provenance: Record<string, string>, total_score: number) => ({
  id,
  audited_domain: "ikonicstikovic.rs",
  market: "serbia",
  updated_at: "2026-08-20T00:00:00Z",
  provenance,
  total_score,
});

Deno.test("dashboard reconciliation selects a fuller published row for the same domain", () => {
  const privateRow = row("private", {
    performance: "measured",
    social: "measured",
    thoughtLeadership: "measured",
    seoAuthority: "missing",
    reputation: "missing",
  }, 156);
  const publishedRow = row("published", {
    performance: "measured",
    social: "measured",
    thoughtLeadership: "measured",
    seoAuthority: "measured",
    reputation: "measured",
  }, 64.1);

  const result = selectDashboardAudit(privateRow, [publishedRow]);

  assertEquals(result.selected.id, "published");
  assertEquals(result.selected.total_score, 64.1);
  assertEquals(result.publishedRow?.id, "published");
});

Deno.test("dashboard reconciliation keeps the private row when published coverage is sparser", () => {
  const privateRow = row("private", {
    performance: "measured",
    social: "measured",
    seoAuthority: "measured",
    thoughtLeadership: "measured",
    reputation: "measured",
  }, 120);
  const publishedRow = row("published", {
    performance: "measured",
    social: "measured",
    seoAuthority: "missing",
    thoughtLeadership: "measured",
    reputation: "missing",
  }, 70);

  const result = selectDashboardAudit(privateRow, [publishedRow]);

  assertEquals(result.selected.id, "private");
  assertEquals(result.selected.total_score, 120);
  assertEquals(result.publishedRow?.id, "published");
});

Deno.test("dashboard reconciliation accepts equal published coverage", () => {
  const privateRow = row("private", {
    performance: "measured",
    social: "measured",
    seoAuthority: "missing",
    thoughtLeadership: "measured",
    reputation: "missing",
  }, 120);
  const publishedRow = row("published", {
    performance: "measured",
    social: "measured",
    seoAuthority: "measured",
    thoughtLeadership: "missing",
    reputation: "missing",
  }, 70);

  const result = selectDashboardAudit(privateRow, [publishedRow]);

  assertEquals(result.selected.id, "published");
  assertEquals(result.selected.total_score, 70);
});