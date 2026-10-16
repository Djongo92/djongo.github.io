// A circular progress ring for "the one number that matters on this screen"
// — deliberately distinct from the linear bars used everywhere scores are
// being compared side by side (the category grid, the peer snapshot list).
// Ring = hero emphasis; bar = comparison. Keeping that distinction
// consistent is what gives the score real visual weight instead of every
// number reading at the same volume.
import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface ScoreRingProps {
  score: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  sublabel?: string;
  colorClass?: string;
}

const ScoreRing = ({ score, max, size = 132, strokeWidth = 9, sublabel, colorClass = "stroke-emerald-500" }: ScoreRingProps) => {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  // Counts up from 0 the first time a score renders, and eases between
  // values on every re-render after (a re-run landing, a category
  // recompute) — a static number update reads as a glitch by comparison.
  const motionScore = useMotionValue(0);
  const springScore = useSpring(motionScore, { stiffness: 90, damping: 20 });
  const roundedScore = useTransform(springScore, (v) => Math.round(v).toString());

  useEffect(() => {
    motionScore.set(score);
  }, [score, motionScore]);

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={colorClass}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-display text-3xl font-semibold text-foreground leading-none">
          {roundedScore}
        </motion.span>
        <span className="text-[10px] text-muted-foreground font-body mt-0.5">/ {max}</span>
        {sublabel && <span className="text-[9px] text-muted-foreground font-body mt-1 text-center px-2 leading-tight">{sublabel}</span>}
      </div>
    </div>
  );
};

export default ScoreRing;
