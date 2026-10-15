import { Info, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_META, PROVENANCE_META, type CategoryKey, type Provenance } from "@/lib/visibilityCategories";
import { CATEGORY_INPUT_FORMATTERS } from "@/lib/visibilityInputFormatters";
import { isStale, DIRECTORY_STALE_AFTER_DAYS } from "@/lib/scoreFreshness";
import type { ReputationRaw } from "@/components/dashboard/CommandCenter";
import { gbpPoints, REPUTATION_WEIGHTS } from "../../../supabase/functions/_shared/methodology";

// Shared "what am I looking at" layer for the Market Visibility Score —
// used on both the Command Center's category grid and the Analytics
// drill-down, so a lawyer/marketer gets the same plain-English framing
// wherever they run into a category or a provenance tag.

interface CategoryExplainerProps {
  categoryKey: CategoryKey;
  /** This firm's actual raw_metrics, if available — shown as real evidence
   *  under the formula (the same numbers the Battle Plan PDF's "how this
   *  was calculated" appendix cites), not just an abstract rule. */
  rawMetrics?: Record<string, unknown>;
}

/** Structured sub-score breakdown shown inside the Reputation popover.
 *  Renders as a mini table so each source's contribution is immediately clear. */
const ReputationInputsBreakdown = ({ r }: { r: ReputationRaw }) => {
  const isVerified = r.gbpSource === "google_places_api";
  const badge = isVerified
    ? <span className="eyebrow eyebrow-tight text-[9px] text-emerald-500 ml-1">Verified</span>
    : <span className="eyebrow eyebrow-tight text-[9px] text-muted-foreground ml-1">Self-reported</span>;

  return (
    <div className="border-t border-border/50 pt-2 mt-2 space-y-1">
      <p className="eyebrow eyebrow-tight text-[10px] text-primary mb-1.5">Your sub-scores</p>

      {/* GBP row */}
      <div className="flex items-center justify-between text-[11px] font-body">
        <span className="text-secondary-foreground/70 flex items-center gap-0.5">
          Google Business Profile{badge}
        </span>
        <span className="text-foreground">
          {r.gbpScore != null ? `${gbpPoints(r.gbpScore)}/${REPUTATION_WEIGHTS.googleBusinessProfile} pts` : (r.gbpListed ? "claimed" : "not claimed")}
        </span>
      </div>
      {isVerified && (r.gbpRating != null || r.gbpReviewCount != null) && (
        <p className="text-[10px] text-muted-foreground font-body pl-2">
          {r.gbpRating != null && `★ ${r.gbpRating}`}
          {r.gbpRating != null && r.gbpReviewCount != null && " · "}
          {r.gbpReviewCount != null && `${r.gbpReviewCount} reviews`}
        </p>
      )}

      {/* Directory rows */}
      {r.chambers && (
        <div className="flex items-center justify-between text-[11px] font-body">
          <span className="text-secondary-foreground/70">Chambers</span>
          <span className="text-foreground">
            {Math.round((r.chambers.points ?? 0) * 10) / 10}/{REPUTATION_WEIGHTS.chambers.breadth + REPUTATION_WEIGHTS.chambers.depth} pts · {r.chambers.count} table{r.chambers.count !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      {r.legal500 && (
        <div className="flex items-center justify-between text-[11px] font-body">
          <span className="text-secondary-foreground/70">Legal 500</span>
          <span className="text-foreground">
            {Math.round((r.legal500.points ?? 0) * 10) / 10}/{REPUTATION_WEIGHTS.legal500.breadth + REPUTATION_WEIGHTS.legal500.depth} pts · {r.legal500.count} table{r.legal500.count !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      {r.iflr1000 && (
        <div className="flex items-center justify-between text-[11px] font-body">
          <span className="text-secondary-foreground/70">IFLR1000</span>
          <span className="text-foreground">
            {Math.round((r.iflr1000.points ?? 0) * 10) / 10}/{REPUTATION_WEIGHTS.iflr1000.breadth + REPUTATION_WEIGHTS.iflr1000.depth} pts · {r.iflr1000.count} table{r.iflr1000.count !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      {r.directoryLastVerifiedAt && isStale(r.directoryLastVerifiedAt, DIRECTORY_STALE_AFTER_DAYS) && (
        <div className="flex items-center pt-1">
          <span
            className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-body"
            title="This directory data (Chambers/Legal 500/IFLR1000) hasn't been re-reviewed in over 120 days"
          >
            <Clock className="w-2.5 h-2.5" /> Needs refresh
          </span>
        </div>
      )}
    </div>
  );
};

export const CategoryExplainer = ({ categoryKey, rawMetrics }: CategoryExplainerProps) => {
  const meta = CATEGORY_META[categoryKey];
  const inputsLine = rawMetrics ? CATEGORY_INPUT_FORMATTERS[categoryKey](rawMetrics) : null;
  const reputationRaw = categoryKey === "reputation" ? (rawMetrics?.reputation as ReputationRaw | undefined) : undefined;
  const showReputationDetail = reputationRaw && (reputationRaw.gbpScore != null || reputationRaw.chambers || reputationRaw.legal500 || reputationRaw.iflr1000);

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
        aria-label={`What is ${meta.label}?`}
      >
        <Info className="w-3.5 h-3.5" />
      </PopoverTrigger>
      <PopoverContent onClick={(e) => e.stopPropagation()} className="text-sm font-body space-y-2 w-72">
        <p className="eyebrow text-[10px] text-primary">{meta.label}</p>
        <p className="text-foreground">{meta.what}</p>
        <p className="text-secondary-foreground/80">{meta.why}</p>
        <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2 mt-2">{meta.how}</p>
        {showReputationDetail ? (
          <ReputationInputsBreakdown r={reputationRaw!} />
        ) : inputsLine ? (
          <p className="text-[11px] text-foreground/80 border-t border-border/50 pt-2 mt-2">
            <span className="text-primary">Your inputs: </span>{inputsLine}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

interface ProvenanceBadgeProps {
  provenance: string;
}

export const ProvenanceBadge = ({ provenance }: ProvenanceBadgeProps) => {
  const meta = PROVENANCE_META[provenance as Provenance] ?? PROVENANCE_META.missing;
  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="text-[10px] font-body text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2"
      >
        {meta.label}
      </PopoverTrigger>
      <PopoverContent onClick={(e) => e.stopPropagation()} className="text-xs font-body w-64">
        {meta.description}
      </PopoverContent>
    </Popover>
  );
};
