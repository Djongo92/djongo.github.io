import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, Trophy, Sparkles } from "lucide-react";
import { DEMO_AUDIT, DEMO_DISPLAY_NAME, DEMO_DOMAIN } from "@/data/demoData";

interface DemoScoreTeaserProps {
  /** Flips the app into real demo mode (enableDemoMode + reload) — the same
   * destination "See it with sample data" always led to, just reached via
   * the same teaser → reveal → unlock beats the real journey uses. */
  onUnlock: () => void;
  onBack: () => void;
}

const PERFORMANCE_MAX = 20;
const REPUTATION_MAX = 55; // Petrović & Partners is directory-matched in the demo data.

/**
 * A canned stand-in for LiveScoreTeaser, built so the same "type a domain →
 * watch two categories compute → unlock the full 200-point score" arc is
 * walkable entirely offline, using the sample firm's real (if fictional)
 * audit numbers instead of a live network call. Exists because the real
 * journey's unlock step is a real Supabase Auth signup, which depends on
 * email confirmation actually arriving — something this session can't
 * guarantee is configured. This version can't fail, so it's what a demo
 * walkthrough should reach for.
 */
const DemoScoreTeaser = ({ onUnlock, onBack }: DemoScoreTeaserProps) => {
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const runTeaser = () => {
    if (loading || revealed) return;
    setLoading(true);
    // Same beat as the real teaser (type → wait → reveal) — the delay is
    // theatrical, not a real fetch, so it never depends on the network.
    window.setTimeout(() => {
      setLoading(false);
      setRevealed(true);
    }, 900);
  };

  const teaserTotal = DEMO_AUDIT.performance_score + DEMO_AUDIT.reputation_score;
  const teaserMax = PERFORMANCE_MAX + REPUTATION_MAX;
  const perfRatio = DEMO_AUDIT.performance_score / PERFORMANCE_MAX;
  const repRatio = DEMO_AUDIT.reputation_score / REPUTATION_MAX;
  const weaker = perfRatio <= repRatio ? "performance" : "reputation";

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={DEMO_DOMAIN}
                readOnly
                aria-label="Sample firm domain"
                className="flex-1 bg-secondary/80 backdrop-blur-sm border border-border rounded-lg text-foreground px-5 py-4 text-base font-body cursor-not-allowed"
              />
              <button
                type="button"
                onClick={runTeaser}
                disabled={loading}
                className="bg-primary text-primary-foreground font-body font-medium tracking-wide rounded-lg hover:bg-gold-light transition-all disabled:opacity-30 flex items-center justify-center gap-2 tap-scale shrink-0 px-6 py-4 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get the free score <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/70 font-body flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 shrink-0" /> Sample data — {DEMO_DISPLAY_NAME}, a fictional firm. Walks the same steps a real audit does.
            </p>
            <button onClick={onBack} className="text-[11px] text-muted-foreground hover:text-foreground font-body">
              ← Use my own real domain instead
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-xl p-6"
          >
            <div className="text-center mb-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="font-display text-primary font-semibold text-6xl"
              >
                {Math.round(teaserTotal)}<span className="text-xl text-muted-foreground">/{teaserMax}</span>
              </motion.div>
              <p className="text-xs text-muted-foreground font-body mt-1">Teaser score · {DEMO_DOMAIN}</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center gap-3"
            >
              <Trophy className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs font-body text-foreground">
                <strong>Better than {DEMO_AUDIT.percentile}%</strong> of {DEMO_AUDIT.peer_count} regional peer firms tracked in Serbia.
              </p>
            </motion.div>

            <div className="space-y-2 text-sm font-body">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Performance (PageSpeed)</span>
                <span className="text-muted-foreground">{DEMO_AUDIT.performance_score} / {PERFORMANCE_MAX}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Reputation</span>
                <span className="text-muted-foreground">{DEMO_AUDIT.reputation_score} / {REPUTATION_MAX}</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-body">
                Matched to "{DEMO_DISPLAY_NAME}" in the directory.
              </p>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-xs text-muted-foreground font-body italic"
            >
              {weaker === "performance"
                ? "Your site's real-world speed is the softer of the two — that's costing you visibility before a single click happens."
                : "Your legal-directory standing is the softer of the two — Chambers and Legal 500 recognition is usually the fastest lever available to close that gap."}
            </motion.p>

            <div className="mt-5 pt-5 border-t border-border/40 text-center space-y-3">
              <p className="text-xs text-muted-foreground font-body">
                This is 2 of 5 categories. The full score adds Social Media, SEO &amp; Authority, and Thought Leadership —
                already computed for this sample firm.
              </p>
              <button
                onClick={onUnlock}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body font-medium"
              >
                Unlock the full score + Battle Plan <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DemoScoreTeaser;
