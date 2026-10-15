// The 30/60/90 roadmap rendered as a campaign map rather than a list —
// three phase nodes strung along an animated advance line. On mobile the
// line turns vertical and the phases stack. Missing roadmap gets a dashed
// placeholder with a run CTA; stale roadmap admits its age.
import { motion } from "framer-motion";
import { Map as MapIcon, RefreshCw, ArrowRight } from "lucide-react";
import type { RoadmapCache } from "@/hooks/useBattlePlanCache";
import { isStale, timeAgo } from "./battlePlanModel";

interface Props {
  roadmap: RoadmapCache | null;
  onRun: () => void;
}

const CampaignMap = ({ roadmap, onRun }: Props) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
  >
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <MapIcon className="w-4 h-4 text-gold-light" />
        <h2 className="eyebrow text-[10px] text-muted-foreground">The campaign · 30/60/90</h2>
      </div>
      {roadmap && (
        isStale(roadmap.capturedAt) ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-body text-amber-400/90">
            <RefreshCw className="w-3 h-3" /> {timeAgo(roadmap.capturedAt)} old — worth a refresh
          </span>
        ) : (
          <span className="text-[10px] font-body text-muted-foreground">updated {timeAgo(roadmap.capturedAt)}</span>
        )
      )}
    </div>

    {!roadmap ? (
      <div className="border border-dashed border-border/60 rounded-sm p-8 text-center">
        <MapIcon className="w-6 h-6 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm text-foreground font-body mb-1">No campaign drawn up yet</p>
        <p className="text-xs text-muted-foreground font-body mb-5 max-w-md mx-auto">
          The campaign itself — sequenced moves for the next ninety days, each tied back to the guidebook chapter it came from.
        </p>
        <button
          onClick={onRun}
          className="inline-flex items-center gap-2 bg-gold text-primary-foreground px-5 py-2.5 rounded-sm font-body text-sm hover:bg-gold-light transition-colors"
        >
          Generate 30/60/90 Roadmap <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    ) : (
      <div className="bg-card border border-border/50 rounded-sm p-6">
        <p className="text-sm text-secondary-foreground/80 font-body leading-relaxed mb-8 line-clamp-2">{roadmap.summary}</p>

        <div className="relative">
          {/* The advance line — desktop only; phases stack vertically on mobile. */}
          <div className="hidden sm:block absolute top-5 left-[16.66%] right-[16.66%] h-px bg-border/60">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-gold/80 via-gold/50 to-gold/20"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
            />
          </div>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {roadmap.phases.map((phase, i) => (
              <motion.div
                key={phase.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.18, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                className="relative sm:border-0 border-l-2 border-gold/30 sm:pl-0 pl-5"
              >
                <div className="relative z-10 w-10 h-10 rounded-full bg-card border border-gold/50 text-gold-light font-display text-sm flex items-center justify-center mb-3">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-body font-medium text-foreground">{phase.label}</p>
                  <p className="text-[11px] text-muted-foreground font-body mb-3">{phase.focus}</p>
                  <div className="space-y-2.5">
                    {phase.actions.map((action) => (
                      <div key={action.title} className="bg-secondary/40 border border-border/40 rounded-sm px-3 py-2">
                        <p className="text-xs font-body text-foreground">{action.title}</p>
                        <p className="text-[10px] text-muted-foreground font-body line-clamp-2 mt-0.5">{action.why}</p>
                        {action.chapterRef && (
                          <p className="text-[9px] font-body text-primary/70 mt-1">↳ {action.chapterRef}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )}
  </motion.section>
);

export default CampaignMap;
