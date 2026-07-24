// A distinct, prominent, one-time-ever celebration for a genuine milestone
// (a round score threshold, a peer-percentile tier) — bigger and rarer than
// ScoreBurst's quiet particle burst, which fires on every routine personal
// best. See useMilestoneCelebration.ts for how "genuine" is decided.
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import ModalShell from "@/components/ui/modal-shell";
import type { Milestone } from "@/hooks/useMilestoneCelebration";

interface Props {
  milestone: Milestone | null;
  onDismiss: () => void;
}

const CONFETTI_COUNT = 36;
const COLORS = ["hsl(var(--primary))", "#f5c451", "#34d399", "#60a5fa", "#f472b6"];

const MilestoneCelebration = ({ milestone, onDismiss }: Props) => {
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const confetti = useMemo(
    () =>
      Array.from({ length: reduceMotion ? 0 : CONFETTI_COUNT }, (_, i) => ({
        x: (Math.random() - 0.5) * 260,
        rotate: Math.random() * 360,
        delay: Math.random() * 0.3,
        color: COLORS[i % COLORS.length],
        size: 5 + Math.random() * 4,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [milestone?.id, reduceMotion],
  );

  const copy = milestone
    ? milestone.kind === "score"
      ? { headline: `${milestone.value} / 200`, body: `Your Market Visibility Score just crossed ${milestone.value} points — a first for this firm.` }
      : { headline: `Top ${100 - milestone.value}%`, body: `You're now better than ${milestone.value}% of your peer group — a first for this firm.` }
    : { headline: "", body: "" };

  return (
    <ModalShell open={!!milestone} onClose={onDismiss} maxWidthClass="max-w-sm">
      <div className="relative px-8 py-10 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {confetti.map((c, i) => (
            <motion.span
              key={i}
              className="absolute rounded-sm left-1/2 top-0"
              style={{ width: c.size, height: c.size, background: c.color }}
              initial={{ x: c.x, y: -10, opacity: 1, rotate: 0 }}
              animate={{ y: 260, opacity: 0, rotate: c.rotate }}
              transition={{ duration: 1.6, delay: c.delay, ease: "easeIn" }}
            />
          ))}
        </div>
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-gold-light flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-body mb-2">New milestone</p>
          <h2 className="font-display text-3xl text-foreground font-semibold mb-2">{copy.headline}</h2>
          <p className="text-sm text-secondary-foreground/80 font-body mb-6">{copy.body}</p>
          <button
            onClick={onDismiss}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body"
          >
            Keep going →
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default MilestoneCelebration;
