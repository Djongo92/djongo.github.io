// §9 — Reports and exports: "Excel export" as a real .csv — Excel opens it
// natively, and it needs zero new dependencies. (An earlier pass added the
// `xlsx` package for a true .xlsx file, but it carries known, unpatched
// prototype-pollution/ReDoS CVEs with no fixed release on npm; CSV via the
// existing toCsv/downloadCsv helper — already used by the Visibility/
// Recognition Index pages — gets the same "open it in Excel" outcome
// without introducing that risk.) Row-per-category plus a trailing
// row-per-history-point block, in one file so a partner building their own
// chart has both the current breakdown and the trend in one download.
import { toCsv, downloadCsv } from "@/lib/csv";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/visibilityCategories";
import type { ExecutiveReportData } from "@/lib/executiveReportData";

export function downloadExecutiveReportCsv(data: ExecutiveReportData) {
  const categoryRows = CATEGORY_ORDER.map((key) => {
    const meta = CATEGORY_META[key];
    const cat = data.categories[key];
    return {
      section: "category",
      label: meta.label,
      score: Math.round((cat?.score ?? 0) * 10) / 10,
      max: meta.max,
      provenance: cat?.provenance ?? "missing",
      date: "",
    };
  });
  const historyRows = data.history.map((h) => ({
    section: "history",
    label: "Total score",
    score: Math.round(h.totalScore * 10) / 10,
    max: 200,
    provenance: "",
    date: new Date(h.recordedAt).toLocaleDateString(),
  }));

  const csv = toCsv([...categoryRows, ...historyRows], [
    { key: "section", header: "Section" },
    { key: "label", header: "Label" },
    { key: "score", header: "Score" },
    { key: "max", header: "Max" },
    { key: "provenance", header: "Provenance" },
    { key: "date", header: "Date" },
  ]);

  downloadCsv(`${data.firmName.replace(/[^a-z0-9]+/gi, "-")}-executive-report.csv`, csv);
}
