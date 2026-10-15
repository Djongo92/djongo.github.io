// The Battle Plan as its own page — a living surface, not a PDF preview.
// Hero (plan strength + badges), the 30/60/90 campaign map, the intel
// sections with real content previews and honest staleness, and the
// workflow board for execution. The PDF export demotes to a secondary
// action in the hero. Replaces the old modal in BattlePlan.tsx; both now
// share battlePlanModel.ts so the numbers always agree.
import { useState } from "react";
import { toast } from "sonner";
import { ListChecks } from "lucide-react";
import { useBattlePlanCache } from "@/hooks/useBattlePlanCache";
import { useFirmContext } from "@/hooks/useFirmContext";
import { useFirmLogo } from "@/hooks/useFirmLogo";
import { useBattlePlanMilestones } from "@/hooks/useBattlePlanMilestones";
import MilestoneCelebration from "@/components/visibility/MilestoneCelebration";
import WorkflowBoard from "@/components/workflow/WorkflowBoard";
import BattlePlanHero from "./BattlePlanHero";
import CampaignMap from "./CampaignMap";
import IntelGrid from "./IntelGrid";
import { buildSteps, planTotals, earnedBadgeIds, hasAnyInput, type StepKey } from "./battlePlanModel";

interface Props {
  readChaptersCount: number;
  totalChapters: number;
  implementationScore: number;
  /** Every "Run it now" / "Rerun it" CTA funnels through here with the
   *  step's key — Index routes it to the real tool (progress launch bus,
   *  maturity modal, or workshop tool handoff), never just a section. */
  onRunTool: (key: StepKey) => void;
}

const BattlePlanPage = ({ readChaptersCount, totalChapters, implementationScore, onRunTool }: Props) => {
  const { roast, competitor, roadmap, maturity, headline, bio, visibilityScore } = useBattlePlanCache();
  const { context } = useFirmContext();
  const { logo: logoDataUrl } = useFirmLogo();
  const [exporting, setExporting] = useState(false);

  const slots = { roast, competitor, roadmap, maturity, headline, bio, visibilityScore };
  const steps = buildSteps(slots);
  const totals = planTotals(steps);
  const earned = earnedBadgeIds(slots);
  const hasAny = hasAnyInput(slots);

  const roadmapActionSeeds = (roadmap?.phases ?? []).flatMap((phase) =>
    phase.actions.map((a) => ({ title: a.title, description: a.why, phaseLabel: phase.label, chapterRef: a.chapterRef })),
  );

  const { badge, dismiss: dismissBadge } = useBattlePlanMilestones({
    roast: !!roast, competitor: !!competitor, roadmap: !!roadmap, maturity: !!maturity,
    headline: !!headline, bio: !!bio, visibilityScore: !!visibilityScore,
  });

  const exportPdf = async () => {
    if (!hasAny) {
      toast.error("Run at least one analysis first");
      return;
    }
    setExporting(true);
    try {
      // jspdf stays a dynamic import — see the old BattlePlan.tsx note; it
      // is heavy and only ever needed on this explicit click.
      const { buildPdf } = await import("../battlePlanPdf");
      buildPdf({ roast, competitor, roadmap, maturity, headline, bio, visibilityScore, context, readChaptersCount, totalChapters, implementationScore, logoDataUrl });
      toast.success("Battle Plan downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't build PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-14">
      <BattlePlanHero
        totals={totals}
        earned={earned}
        hasAny={hasAny}
        exporting={exporting}
        onExport={exportPdf}
        readChaptersCount={readChaptersCount}
        totalChapters={totalChapters}
        implementationScore={implementationScore}
      />

      <CampaignMap roadmap={roadmap} onRun={() => onRunTool("roadmap")} />

      <IntelGrid slots={slots} steps={steps} onRun={onRunTool} />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <ListChecks className="w-4 h-4 text-gold-light" />
          <h2 className="eyebrow text-[10px] text-muted-foreground">Execute · assign, comment, approve, re-measure</h2>
        </div>
        <WorkflowBoard roadmapActions={roadmapActionSeeds} />
      </section>

      <p className="text-[11px] text-muted-foreground/70 font-body text-center leading-relaxed">
        The PDF export always includes automatically: firm context · reading &amp; implementation progress ·
        cover page · Uvid branding · generated date
      </p>

      <MilestoneCelebration
        open={!!badge}
        celebrationKey={badge?.id}
        eyebrow="Battle Plan badge earned"
        headline={badge?.headline ?? ""}
        body={badge?.body ?? ""}
        onDismiss={dismissBadge}
      />
    </div>
  );
};

export default BattlePlanPage;
