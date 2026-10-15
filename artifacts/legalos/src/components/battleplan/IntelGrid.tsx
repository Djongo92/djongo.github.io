// The intel sections — one card per Battle Plan input (the roadmap gets its
// own CampaignMap above). Done cards show a real preview of the captured
// content plus the intel's age; missing cards read as opportunities with a
// run CTA; stale cards get an amber refresh nudge. CTAs route to wherever
// the owning tool lives (Progress page, maturity modal, or Workshop).
import { motion } from "framer-motion";
import {
  Flame, Target, Gauge, Trophy, UserSquare, ShieldCheck, RefreshCw, ArrowRight, type LucideIcon,
} from "lucide-react";
import {
  isStale, timeAgo, type BattlePlanSlots, type BattlePlanStep, type StepKey,
} from "./battlePlanModel";
import { computeMeasuredTotals, measuredScoreLabel } from "@/lib/measuredScore";

interface Props {
  slots: BattlePlanSlots;
  steps: BattlePlanStep[];
  /** Fired with the step's key — the page routes it to the actual tool
   *  (progress launch bus, maturity modal, or workshop tool handoff). */
  onRun: (key: StepKey) => void;
}

const ICONS: Partial<Record<StepKey, LucideIcon>> = {
  roast: Flame,
  competitor: Target,
  visibilityScore: ShieldCheck,
  maturity: Gauge,
  headline: Trophy,
  bio: UserSquare,
};

// Display order: the two core analyses, then diagnostics, then voice.
const ORDER: StepKey[] = ["roast", "competitor", "visibilityScore", "maturity", "headline", "bio"];

const impactClass = (impact: "high" | "medium" | "low") =>
  impact === "high"
    ? "border-gold/40 text-gold-light"
    : impact === "medium"
      ? "border-primary/40 text-primary"
      : "border-border/50 text-muted-foreground";

const IntelGrid = ({ slots, steps, onRun }: Props) => {
  const stepFor = (key: StepKey) => steps.find((s) => s.key === key)!;

  const preview = (key: StepKey) => {
    switch (key) {
      case "roast": {
        const roast = slots.roast!;
        return (
          <>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-display text-3xl text-gold-light">{roast.grade}</span>
              <p className="text-xs text-secondary-foreground/80 font-body leading-snug">{roast.verdict}</p>
            </div>
            <ol className="space-y-1 mt-2">
              {roast.topThreeFixes.slice(0, 3).map((fix, i) => (
                <li key={i} className="text-[11px] text-muted-foreground font-body flex gap-2">
                  <span className="text-gold-light/70 shrink-0">{i + 1}.</span> <span className="line-clamp-1">{fix}</span>
                </li>
              ))}
            </ol>
          </>
        );
      }
      case "competitor": {
        const competitor = slots.competitor!;
        return (
          <>
            <p className="text-xs text-secondary-foreground/80 font-body leading-relaxed line-clamp-3">{competitor.executiveSummary}</p>
            <div className="space-y-1.5 mt-3">
              {competitor.recommendedMoves.slice(0, 2).map((move) => (
                <div key={move.move} className="flex items-start gap-2">
                  <span className={`text-[9px] font-body uppercase tracking-wide border rounded-full px-1.5 py-0.5 shrink-0 mt-px ${impactClass(move.impact)}`}>
                    {move.impact}
                  </span>
                  <p className="text-[11px] text-muted-foreground font-body line-clamp-1">{move.move}</p>
                </div>
              ))}
            </div>
          </>
        );
      }
      case "visibilityScore": {
        const score = slots.visibilityScore!;
        const measured = computeMeasuredTotals(score.categories);
        return (
          <>
            <p className="font-display text-3xl text-foreground">{measuredScoreLabel(Math.round(score.totalScore), measured)}</p>
            <p className="text-[11px] text-muted-foreground font-body mt-1">
              {score.displayName || score.auditedDomain} · {score.market}
            </p>
            {score.percentile !== null && (
              <p className="text-[11px] text-gold-light/80 font-body mt-1">
                Better than {score.percentile}% of {score.peerCount} peer firms
              </p>
            )}
          </>
        );
      }
      case "maturity": {
        const maturity = slots.maturity!;
        return (
          <>
            <p className="font-display text-3xl text-foreground">{maturity.score}%</p>
            <div className="space-y-1.5 mt-3">
              {maturity.dimensions.slice(0, 4).map((dim) => (
                <div key={dim.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-body w-24 truncate shrink-0">{dim.label}</span>
                  <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gold/70 rounded-full" style={{ width: `${Math.min(100, dim.score)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }
      case "headline": {
        const headline = slots.headline!;
        return (
          <>
            <p className="text-sm text-foreground font-body leading-snug">“{headline.text}”</p>
            <p className="text-[10px] text-gold-light/70 font-body mt-2 uppercase tracking-wide">{headline.angle}</p>
            <p className="text-[11px] text-muted-foreground font-body mt-1 line-clamp-2">{headline.why}</p>
          </>
        );
      }
      case "bio": {
        const bio = slots.bio!;
        return (
          <>
            {(bio.name || bio.role) && (
              <p className="text-xs text-foreground font-body mb-1.5">
                {bio.name}{bio.name && bio.role ? " · " : ""}{bio.role}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground font-body leading-relaxed line-clamp-3">{bio.rewrite}</p>
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-gold-light" />
        <h2 className="eyebrow text-[10px] text-muted-foreground">The intel</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ORDER.map((key, i) => {
          const step = stepFor(key);
          const Icon = ICONS[key] ?? ShieldCheck;
          const stale = step.done && isStale(step.capturedAt);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className={`rounded-sm p-5 flex flex-col ${
                step.done ? "bg-card border border-border/50" : "border border-dashed border-border/60 bg-card/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${step.done ? "text-gold-light" : "text-muted-foreground/50"}`} />
                  <p className={`text-sm font-body font-medium truncate ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                </div>
                {step.done && step.capturedAt && (
                  <span className={`text-[10px] font-body shrink-0 ${stale ? "text-amber-400/90" : "text-muted-foreground"}`}>
                    {timeAgo(step.capturedAt)}
                  </span>
                )}
              </div>

              <div className="flex-1">
                {step.done ? preview(key) : (
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">{step.adds}</p>
                )}
              </div>

              {stale && (
                <p className="inline-flex items-center gap-1.5 text-[10px] font-body text-amber-400/90 mt-3">
                  <RefreshCw className="w-3 h-3" /> This intel has aged — a rerun would sharpen the plan
                </p>
              )}

              <button
                onClick={() => onRun(step.key)}
                className={`mt-4 inline-flex items-center gap-1.5 text-xs font-body transition-colors self-start ${
                  step.done ? "text-muted-foreground hover:text-foreground" : "text-gold-light hover:text-gold"
                }`}
              >
                {step.done ? (stale ? "Rerun it" : "Open the tool") : "Run it now"} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default IntelGrid;
