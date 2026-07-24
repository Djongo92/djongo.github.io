// A weekly-framed re-engagement ritual: score movement since Monday plus the
// single highest-leverage move for the week — not a new backend surface,
// just this week's slice of data the Command Center already computes
// (history rows, useCommandCenterInsights' ranked feed). No cron, no email;
// this recomputes client-side on every visit.
import { Calendar, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import type { Insight } from "@/hooks/useCommandCenterInsights";

interface Props {
  weekRangeLabel: string;
  weekDelta: number;
  topInsight: Insight | null;
  onInsightAction?: () => void;
}

const MondayBrief = ({ weekRangeLabel, weekDelta, topInsight, onInsightAction }: Props) => {
  return (
    <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">Monday Brief · {weekRangeLabel}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className={`font-display text-2xl font-semibold ${weekDelta > 0 ? "text-emerald-500" : weekDelta < 0 ? "text-destructive" : "text-foreground"}`}>
          {weekDelta > 0 ? "+" : ""}{weekDelta}
        </span>
        <span className="text-xs text-muted-foreground font-body">points this week</span>
        {weekDelta > 0 && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
        {weekDelta < 0 && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
      </div>
      {topInsight ? (
        <div>
          <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-body mb-1">This week's highest-leverage move</p>
          <h3 className="font-display text-base text-foreground mb-1">{topInsight.title}</h3>
          <p className="text-xs text-secondary-foreground/70 font-body mb-3">{topInsight.body}</p>
          {onInsightAction && (
            <button onClick={onInsightAction} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body">
              {topInsight.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-secondary-foreground/70 font-body">Nothing urgent this week — every category is holding steady or above half.</p>
      )}
    </div>
  );
};

export default MondayBrief;
