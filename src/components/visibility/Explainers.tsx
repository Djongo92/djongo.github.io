import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_META, PROVENANCE_META, type CategoryKey, type Provenance } from "@/lib/visibilityCategories";
import { CATEGORY_INPUT_FORMATTERS } from "@/lib/visibilityInputFormatters";

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

export const CategoryExplainer = ({ categoryKey, rawMetrics }: CategoryExplainerProps) => {
  const meta = CATEGORY_META[categoryKey];
  const inputsLine = rawMetrics ? CATEGORY_INPUT_FORMATTERS[categoryKey](rawMetrics) : null;
  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
        aria-label={`What is ${meta.label}?`}
      >
        <Info className="w-3.5 h-3.5" />
      </PopoverTrigger>
      <PopoverContent onClick={(e) => e.stopPropagation()} className="text-sm font-body space-y-2">
        <p className="text-[10px] tracking-[0.15em] uppercase text-primary font-body">{meta.label}</p>
        <p className="text-foreground">{meta.what}</p>
        <p className="text-secondary-foreground/80">{meta.why}</p>
        <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2 mt-2">{meta.how}</p>
        {inputsLine && (
          <p className="text-[11px] text-foreground/80 border-t border-border/50 pt-2 mt-2">
            <span className="text-primary">Your inputs: </span>{inputsLine}
          </p>
        )}
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
