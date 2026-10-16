// A weekly-framed re-engagement ritual: score movement since Monday plus the
// single highest-leverage move for the week. When it's the user's first
// session (no week history yet), it shows a time-appropriate greeting instead
// of delta noise. Renders as the app's greeting — always the first thing
// after the header.
import { Calendar, ArrowRight, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { motionReveal } from "@/lib/motion";
import { motion } from "framer-motion";
import type { Insight } from "@/hooks/useCommandCenterInsights";

interface Props {
  weekRangeLabel: string;
  weekDelta: number;
  topInsight: Insight | null;
  onInsightAction?: () => void;
  firmName?: string;
  isFirstSession?: boolean;
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const MondayBrief = ({ weekRangeLabel, weekDelta, topInsight, onInsightAction, firmName, isFirstSession }: Props) => {
  const greeting = timeGreeting();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionReveal}
      className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-sm p-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="eyebrow text-[10px] text-primary">
          {isFirstSession ? "Welcome" : `Monday Brief · ${weekRangeLabel}`}
        </span>
      </div>

      {isFirstSession ? (
        /* First-session greeting — no delta to show yet */
        <div>
          <div className="flex items-baseline gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-1" />
            <h2 className="font-display text-xl text-foreground">
              {greeting}{firmName ? `, ${firmName}` : ""}. Your score is live.
            </h2>
          </div>
          {topInsight ? (
            <div>
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-body mb-1">Start here this week</p>
              <h3 className="font-display text-base text-foreground mb-1">{topInsight.title}</h3>
              <p className="text-xs text-secondary-foreground/70 font-body mb-3">{topInsight.body}</p>
              {onInsightAction && (
                <button onClick={onInsightAction} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body transition-colors">
                  {topInsight.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-secondary-foreground/70 font-body">
              Run your first audit to unlock your firm's score, peer ranking, and weekly brief.
            </p>
          )}
        </div>
      ) : (
        /* Returning session — show weekly delta */
        <div>
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
                <button onClick={onInsightAction} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body transition-colors">
                  {topInsight.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-secondary-foreground/70 font-body">Nothing urgent this week — every category is holding steady or above half.</p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default MondayBrief;
