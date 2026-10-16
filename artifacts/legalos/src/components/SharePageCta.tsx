// Growth-loop CTA (task #166): every shared artifact is a recipient's first
// touch of the product — close the loop with a route back into the teaser
// funnel. Visually secondary to the shared content: partner trust first,
// recruitment second. Full document load to the marketing site (cross-
// artifact handoff convention — never route-then-redirect); utm_medium names
// the surface so click-through is measurable.
import { ArrowRight } from "lucide-react";

const SharePageCta = ({ source }: { source: "roast-share" | "partner-review" }) => (
  <div className="mt-10 pt-6 border-t border-border/30 text-center">
    <p className="eyebrow text-[9px] text-muted-foreground mb-2">Shared via Uvid</p>
    <p className="text-sm text-secondary-foreground/85 font-body mb-3">
      Wonder how your own firm's website would score?
    </p>
    <a
      href={`/?utm_source=share&utm_medium=${source}`}
      className="inline-flex items-center gap-1.5 text-xs font-body bg-primary text-primary-foreground px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors"
    >
      Get your firm's free roast <ArrowRight className="w-3 h-3" />
    </a>
  </div>
);

export default SharePageCta;
