// The Battle Plan teaser card — the plan itself now lives on its own page
// (components/battleplan/BattlePlanPage.tsx, the "battleplan" section of
// the app shell). This card stays on the Progress page as the entry point:
// plan-strength ring, badge count, and a deep-link. Both surfaces share
// battlePlanModel.ts so the numbers can never drift apart.
import { Swords, ArrowRight } from "lucide-react";
import { useBattlePlanCache } from "@/hooks/useBattlePlanCache";
import ScoreRing from "@/components/visibility/ScoreRing";
import { buildSteps, planTotals, earnedBadgeIds, hasAnyInput } from "@/components/battleplan/battlePlanModel";

interface Props {
  onOpen: () => void;
}

const BattlePlan = ({ onOpen }: Props) => {
  const { roast, competitor, roadmap, maturity, headline, bio, visibilityScore } = useBattlePlanCache();
  const slots = { roast, competitor, roadmap, maturity, headline, bio, visibilityScore };
  const totals = planTotals(buildSteps(slots));
  const earned = earnedBadgeIds(slots);
  const hasAny = hasAnyInput(slots);

  return (
    <button
      onClick={onOpen}
      className="group w-full p-5 bg-gradient-to-br from-gold/10 via-card to-card border border-gold/40 rounded-sm text-left hover:border-gold/70 hover:shadow-lg hover:shadow-gold/10 transition-all relative overflow-hidden"
    >
      <div className="eyebrow absolute top-0 right-0 px-2 py-0.5 bg-gold text-primary-foreground text-[9px]">
        Flagship
      </div>
      <div className="flex items-start gap-4">
        {hasAny ? (
          <ScoreRing score={totals.done} max={totals.total} size={56} strokeWidth={5} colorClass="stroke-gold" />
        ) : (
          <div className="p-2.5 rounded-sm bg-gold/15 text-gold-light">
            <Swords className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg text-foreground mb-1">Your Battle Plan</h3>
          <p className="text-xs text-muted-foreground font-body">
            A living plan that sharpens every time you run an analysis — campaign map, intel, execution board
          </p>
          {hasAny && (
            <p className="text-[11px] text-gold-light font-body mt-2">
              {totals.done}/{totals.total} sections armed
              {earned.size > 0 ? ` · ${earned.size} badge${earned.size === 1 ? "" : "s"} earned` : ""}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-gold-light/60 group-hover:text-gold-light group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
      </div>
    </button>
  );
};

export default BattlePlan;
