// The page header: plan strength ring, status copy, export action, and the
// badge strip. Earned badges pop in with a spring; locked ones teach their
// requirement so the strip doubles as a "what's left" guide.
import { motion } from "framer-motion";
import { Swords, Download, Loader2, ShieldCheck, UserSquare, Trophy, BookOpen, ListChecks, type LucideIcon } from "lucide-react";
import ScoreRing from "@/components/visibility/ScoreRing";
import { BADGE_DEFS, type BadgeId, type PlanTotals } from "./battlePlanModel";

const BADGE_ICONS: Record<BadgeId, LucideIcon> = {
  "foundation-builder": ShieldCheck,
  "voice-found": UserSquare,
  "battle-ready": Swords,
  "fully-armed": Trophy,
};

interface Props {
  totals: PlanTotals;
  earned: Set<BadgeId>;
  hasAny: boolean;
  exporting: boolean;
  onExport: () => void;
  readChaptersCount: number;
  totalChapters: number;
  implementationScore: number;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const } },
};

const BattlePlanHero = ({ totals, earned, hasAny, exporting, onExport, readChaptersCount, totalChapters, implementationScore }: Props) => (
  <motion.section variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-8">
    <div className="flex flex-col sm:flex-row sm:items-center gap-8">
      <motion.div variants={rise} className="shrink-0 flex justify-center">
        <ScoreRing score={totals.done} max={totals.total} size={120} strokeWidth={8} colorClass="stroke-gold" sublabel="Armed" />
      </motion.div>
      <div className="flex-1 min-w-0">
        <motion.p variants={rise} className="eyebrow text-[10px] text-gold-light mb-2">Flagship · A living plan</motion.p>
        <motion.h1 variants={rise} className="font-display text-3xl text-foreground mb-3">Your Battle Plan</motion.h1>
        <motion.p variants={rise} className="text-sm text-secondary-foreground/80 font-body leading-relaxed max-w-xl">
          {hasAny
            ? `${totals.done} of ${totals.total} sections armed — and it never stands still. Every analysis you run sharpens it, every stale section admits it's stale, and the campaign below is yours to execute.`
            : "Not a document you download once and forget — a plan that writes itself every time you run an analysis. Start with any tool below and this page comes alive."}
        </motion.p>
        <motion.div variants={rise} className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={onExport}
            disabled={!hasAny || exporting}
            className="inline-flex items-center gap-2 bg-gold text-primary-foreground px-5 py-2.5 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-gold-light transition-colors"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Building PDF…" : "Export as PDF"}
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-body">
            <BookOpen className="w-3.5 h-3.5" /> {readChaptersCount}/{totalChapters} chapters read
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-body">
            <ListChecks className="w-3.5 h-3.5" /> {implementationScore}% implemented
          </span>
        </motion.div>
      </div>
    </div>

    <motion.div variants={rise} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {BADGE_DEFS.map((def, i) => {
        const isEarned = earned.has(def.id);
        const Icon = BADGE_ICONS[def.id];
        return (
          <motion.div
            key={def.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 + i * 0.08, type: "spring", stiffness: 260, damping: 20 }}
            className={`rounded-sm border p-3 text-center ${
              isEarned ? "border-gold/50 bg-gold/10" : "border-border/40 bg-card/50"
            }`}
          >
            <Icon className={`w-4 h-4 mx-auto mb-1.5 ${isEarned ? "text-gold-light" : "text-muted-foreground/50"}`} />
            <p className={`text-[11px] font-body font-medium ${isEarned ? "text-gold-light" : "text-muted-foreground/70"}`}>{def.label}</p>
            <p className={`text-[9px] font-body mt-0.5 leading-snug ${isEarned ? "text-gold-light/60" : "text-muted-foreground/45"}`}>
              {isEarned ? "Earned" : def.requirement}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  </motion.section>
);

export default BattlePlanHero;
