export type DashboardAuditRow = {
  id: string;
  audited_domain?: string | null;
  market?: string | null;
  updated_at?: string | null;
  provenance?: Record<string, string> | null;
  [key: string]: unknown;
};

const CATEGORY_KEYS = [
  "performance",
  "social",
  "seoAuthority",
  "thoughtLeadership",
  "reputation",
] as const;

export function measuredCategoryCount(row: DashboardAuditRow): number {
  return CATEGORY_KEYS.filter((key) => row.provenance?.[key] !== "missing").length;
}

export function selectDashboardAudit(
  privateRow: DashboardAuditRow,
  publishedRows: DashboardAuditRow[],
): { selected: DashboardAuditRow; publishedRow?: DashboardAuditRow } {
  const publishedRow = publishedRows
    .filter((candidate) =>
      candidate.audited_domain?.toLowerCase() === privateRow.audited_domain?.toLowerCase() &&
      candidate.market === privateRow.market
    )
    .sort((a, b) =>
      measuredCategoryCount(b) - measuredCategoryCount(a) ||
      new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
    )[0];

  return {
    selected: publishedRow && measuredCategoryCount(publishedRow) >= measuredCategoryCount(privateRow)
      ? publishedRow
      : privateRow,
    publishedRow,
  };
}