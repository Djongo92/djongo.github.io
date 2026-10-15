import { CATEGORY_ORDER } from "@/lib/visibilityCategories";

export type DashboardAudit = {
  id: string;
  audited_domain: string;
  market: string;
  updated_at: string;
  provenance?: Record<string, string>;
  [key: string]: unknown;
};

export function measuredCategoryCount(row: DashboardAudit): number {
  return CATEGORY_ORDER.filter((key) => row.provenance?.[key] !== "missing").length;
}

/**
 * Prefer the published row for a matching domain/market when it covers at
 * least as many categories as the account row. This mirrors the edge
 * function's selection rule and keeps the two UI paths independently tested.
 */
export function selectDashboardAudit(
  privateRow: DashboardAudit,
  publishedRows: DashboardAudit[],
): DashboardAudit & {
  dashboard_source: "private" | "public_census";
  public_audit_available: boolean;
} {
  const candidates = publishedRows
    .filter((row) =>
      row.audited_domain.toLowerCase() === privateRow.audited_domain.toLowerCase() &&
      row.market === privateRow.market,
    )
    .sort((a, b) =>
      measuredCategoryCount(b) - measuredCategoryCount(a) ||
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  const published = candidates[0];
  const usePublished = !!published && measuredCategoryCount(published) >= measuredCategoryCount(privateRow);
  return {
    ...(usePublished ? published : privateRow),
    dashboard_source: usePublished ? "public_census" : "private",
    public_audit_available: !!published,
  };
}