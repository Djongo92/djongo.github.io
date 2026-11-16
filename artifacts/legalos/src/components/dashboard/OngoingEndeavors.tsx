import { AlertTriangle, BookOpen, FileText, Gauge } from "lucide-react";
import Campaigns from "@/components/dashboard/Campaigns";
import ClientWinLog from "@/components/dashboard/ClientWinLog";
import type { WorkshopRun } from "@/hooks/useWorkshopHistory";
import type { WorkshopToolId } from "@/lib/handoff";
import type { AuditRow, HistoryRow } from "./auditTypes";

export const timeAgo = (ts: number): string => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

interface OngoingEndeavorsProps {
  readChaptersCount: number;
  totalChapters: number;
  /** Firm Maturity score in percent, or null when it hasn't been run. */
  maturityScore: number | null;
  battlePlanFilled: number;
  runs: WorkshopRun[];
  siteHealthIssues: string[];
  audit: AuditRow;
  history: HistoryRow[];
  onOpenGuidebook: () => void;
  onOpenMaturity: () => void;
  onOpenWorkshopTool: (toolId: WorkshopToolId) => void;
}

/** The Command Center's right column: progress elsewhere in the product,
 *  campaigns, client wins, recent Workshop runs and site-health flags.
 *  Deliberately quieter than the left column's analysis (softer border and
 *  background): secondary reference info, not the thing you came to see. */
export default function OngoingEndeavors({
  readChaptersCount, totalChapters, maturityScore, battlePlanFilled, runs, siteHealthIssues,
  audit, history, onOpenGuidebook, onOpenMaturity, onOpenWorkshopTool,
}: OngoingEndeavorsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-card/40 border border-border/30 rounded-sm p-4">
        <h2 className="font-display text-base text-foreground mb-4">Ongoing Endeavors</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-body">
            <span className="flex items-center gap-2 text-secondary-foreground/80">
              <BookOpen className="w-3.5 h-3.5 text-primary" /> Guidebook
            </span>
            <button onClick={onOpenGuidebook} className="text-primary hover:text-gold-light text-xs">
              {readChaptersCount}/{totalChapters} read
            </button>
          </div>

          <div className="flex items-center justify-between text-sm font-body">
            <span className="flex items-center gap-2 text-secondary-foreground/80">
              <Gauge className="w-3.5 h-3.5 text-primary" /> Firm Maturity
            </span>
            <button onClick={onOpenMaturity} className="text-primary hover:text-gold-light text-xs">
              {maturityScore != null ? `${maturityScore}% scored` : "Not run yet"}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm font-body">
            <span className="flex items-center gap-2 text-secondary-foreground/80">
              <FileText className="w-3.5 h-3.5 text-primary" /> Battle Plan
            </span>
            <span className="text-xs text-muted-foreground">{battlePlanFilled}/7 sections ready</span>
          </div>
        </div>
      </div>

      <Campaigns market={audit.market} auditedDomain={audit.audited_domain} history={history} />

      <ClientWinLog market={audit.market} auditedDomain={audit.audited_domain} />

      <div className="bg-card/40 border border-border/30 rounded-sm p-4">
        <h2 className="font-display text-base text-foreground mb-4">Recent Workshop Activity</h2>
        {runs.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">
            Nothing run yet — the Workshop's eleven tools are one click away.
          </p>
        ) : (
          <div className="space-y-3">
            {runs.slice(0, 5).map((run) => (
              <button
                key={run.id}
                onClick={() => onOpenWorkshopTool(run.toolId)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-body text-muted-foreground">{run.toolLabel}</span>
                  <span className="text-[10px] font-body text-muted-foreground">{timeAgo(run.createdAt)}</span>
                </div>
                <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors truncate">
                  {run.title}
                </p>
                {run.preview && (
                  <p className="text-xs font-body text-secondary-foreground/60 truncate">{run.preview}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {siteHealthIssues.length > 0 && (
        <div className="bg-card border border-amber-500/30 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="eyebrow text-[10px] text-amber-500">Site health</span>
          </div>
          <ul className="space-y-1.5">
            {siteHealthIssues.map((issue) => (
              <li key={issue} className="text-xs text-secondary-foreground/80 font-body">{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
