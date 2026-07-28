// §9 — Reports and exports: the Executive Report is its own artifact —
// score, percentile, AI narrative, category breakdown, and a single
// highest-leverage recommendation — not a shortened version of the
// Dashboard. Exports to PDF, PowerPoint, Word, or CSV ("Excel"), all
// generated client-side from data already loaded in the app. A monthly
// auto-generate toggle files a notification when a new snapshot is ready
// (no SMTP in this codebase, so "scheduled report" means "waiting for you
// in-app," not emailed).
import { useMemo, useState } from "react";
import { FileText, Download, Loader2, X, Presentation, FileSpreadsheet, FileType2 } from "lucide-react";
import { toast } from "sonner";
import type { AuditRow, HistoryRow } from "@/components/dashboard/CommandCenter";
import { useStrategyBrief } from "@/hooks/useStrategyBrief";
import { useExecutiveReportSchedule } from "@/hooks/useExecutiveReportSchedule";
import type { ExecutiveReportData } from "@/lib/executiveReportData";
import { isDemoMode } from "@/lib/demoMode";
import ModalShell from "@/components/ui/modal-shell";

interface Props {
  primaryAudit?: AuditRow;
  history: HistoryRow[];
}

const ExecutiveReport = ({ primaryAudit, history }: Props) => {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const demoMode = isDemoMode();
  const { enabled, saving, setMonthlyEnabled } = useExecutiveReportSchedule();

  const categories = useMemo(() => {
    if (!primaryAudit) return null;
    return {
      performance: { score: primaryAudit.performance_score, max: 20, provenance: primaryAudit.provenance?.performance ?? "missing" },
      social: { score: primaryAudit.social_score, max: 20, provenance: primaryAudit.provenance?.social ?? "missing" },
      seoAuthority: { score: primaryAudit.seo_authority_score, max: 60, provenance: primaryAudit.provenance?.seoAuthority ?? "missing" },
      thoughtLeadership: { score: primaryAudit.thought_leadership_score, max: 45, provenance: primaryAudit.provenance?.thoughtLeadership ?? "missing" },
      reputation: { score: primaryAudit.reputation_score, max: 55, provenance: primaryAudit.provenance?.reputation ?? "missing" },
    };
  }, [primaryAudit]);

  const briefParams = useMemo(() => {
    if (!primaryAudit || !categories) return null;
    return {
      domain: primaryAudit.audited_domain,
      market: primaryAudit.market,
      peerGroup: primaryAudit.peer_group,
      totalScore: primaryAudit.total_score,
      categories,
      siteHealthIssues: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryAudit?.audited_domain, primaryAudit?.market, primaryAudit?.total_score]);
  const { brief } = useStrategyBrief(open ? briefParams : null);

  if (!primaryAudit || !categories) return null;

  const domainHistory = history
    .filter((h) => h.audited_domain === primaryAudit.audited_domain && h.market === primaryAudit.market)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

  const buildData = (): ExecutiveReportData => ({
    firmName: primaryAudit.display_name || primaryAudit.audited_domain,
    domain: primaryAudit.audited_domain,
    market: primaryAudit.market,
    peerGroup: primaryAudit.peer_group,
    totalScore: primaryAudit.total_score,
    percentile: primaryAudit.percentile ?? null,
    peerCount: primaryAudit.peer_count ?? 0,
    narrative: brief?.narrative ?? null,
    categories: {
      performance: categories.performance,
      social: categories.social,
      seoAuthority: categories.seoAuthority,
      thoughtLeadership: categories.thoughtLeadership,
      reputation: categories.reputation,
    },
    history: domainHistory.map((h) => ({ recordedAt: h.recorded_at, totalScore: h.total_score })),
    generatedAt: new Date(),
  });

  const handleExport = async (format: "pdf" | "pptx" | "docx" | "csv") => {
    setGenerating(format);
    try {
      const data = buildData();
      if (format === "pdf") {
        const { buildExecutiveReportPdf } = await import("@/lib/executiveReportPdf");
        buildExecutiveReportPdf(data);
      } else if (format === "pptx") {
        const { buildExecutiveReportPptx } = await import("@/lib/executiveReportPptx");
        await buildExecutiveReportPptx(data);
      } else if (format === "docx") {
        const { buildExecutiveReportDocx } = await import("@/lib/executiveReportDocx");
        await buildExecutiveReportDocx(data);
      } else {
        const { downloadExecutiveReportCsv } = await import("@/lib/executiveReportCsv");
        downloadExecutiveReportCsv(data);
      }
      toast.success("Executive Report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't build that export");
    } finally {
      setGenerating(null);
    }
  };

  const handleToggleMonthly = async (next: boolean) => {
    if (demoMode) {
      toast.info("Monthly scheduling isn't available in demo mode.");
      return;
    }
    await setMonthlyEnabled(next);
    toast.success(next ? "You'll get a notification when next month's snapshot is ready" : "Monthly snapshots turned off");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full p-5 bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-sm text-left hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-primary/15 text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Executive Report</h3>
            <p className="text-xs text-muted-foreground font-body">
              A board-level summary — score, percentile, and what's next — exportable as PDF, PowerPoint, Word, or Excel.
            </p>
          </div>
        </div>
      </button>

      <ModalShell open={open} onClose={() => setOpen(false)} maxWidthClass="max-w-lg">
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="font-display text-lg text-foreground">Executive Report</h3>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center pb-4 border-b border-border/40">
            <p className="font-display text-4xl text-foreground font-semibold">{Math.round(primaryAudit.total_score)}<span className="text-base text-muted-foreground font-body"> / 200</span></p>
            <p className="text-sm text-foreground font-body">{primaryAudit.display_name || primaryAudit.audited_domain}</p>
            {primaryAudit.percentile !== null && primaryAudit.percentile !== undefined && (
              <p className="text-xs text-muted-foreground font-body mt-1">
                Better than {primaryAudit.percentile}% of {primaryAudit.peer_count ?? 0} peer firms in {primaryAudit.market}
              </p>
            )}
          </div>

          {brief?.narrative && (
            <p className="text-xs text-secondary-foreground/80 font-body italic leading-relaxed">{brief.narrative}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleExport("pdf")}
              disabled={generating !== null}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-xs font-body border border-border/50 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
            >
              {generating === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
            </button>
            <button
              onClick={() => handleExport("pptx")}
              disabled={generating !== null}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-xs font-body border border-border/50 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
            >
              {generating === "pptx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />} PowerPoint
            </button>
            <button
              onClick={() => handleExport("docx")}
              disabled={generating !== null}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-xs font-body border border-border/50 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
            >
              {generating === "docx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileType2 className="w-3.5 h-3.5" />} Word
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={generating !== null}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-xs font-body border border-border/50 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
            >
              {generating === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div>
              <p className="text-xs font-body text-foreground">Monthly snapshot</p>
              <p className="text-[11px] text-muted-foreground font-body">Notifies you when a new one's ready to generate.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleToggleMonthly(e.target.checked)}
                disabled={saving}
                className="accent-primary"
              />
            </label>
          </div>
        </div>
      </ModalShell>
    </>
  );
};

export default ExecutiveReport;
