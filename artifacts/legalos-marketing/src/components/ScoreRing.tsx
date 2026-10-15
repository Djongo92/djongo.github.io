import { motion, useAnimation, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
}

// maxScore defaults to the public 0–500 display scale — the raw 0–200
// internal scale must never reach a user-facing render by default.
export function ScoreRing({ score, maxScore = 500, size = 300, strokeWidth = 8 }: ScoreRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (score / maxScore) * circumference;

  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-50px" });
  const controls = useAnimation();

  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (isInView) {
      controls.start({
        strokeDashoffset: targetOffset,
        transition: { duration: 2, ease: "easeOut" }
      });

      let startTime: number;
      const duration = 2000;

      const animateScore = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const ease = 1 - Math.pow(1 - Math.min(progress / duration, 1), 4);
        setDisplayScore(Math.floor(ease * score));
        if (progress < duration) {
          requestAnimationFrame(animateScore);
        } else {
          setDisplayScore(score);
        }
      };

      requestAnimationFrame(animateScore);
    }
  }, [isInView, controls, score, targetOffset]);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-primary"
          initial={{ strokeDashoffset: circumference }}
          animate={controls}
          style={{ strokeDasharray: circumference }}
        />
      </svg>

      <div className="absolute flex flex-col items-center justify-center text-center">
        <div className="text-sm text-muted-foreground mb-2 eyebrow">Market Visibility Score</div>
        <div className="text-6xl md:text-7xl font-serif text-white tracking-tight">
          {displayScore}
        </div>
        <div className="text-sm text-muted-foreground mt-2 border-t border-border pt-2 tabular-nums font-medium">/ {maxScore}</div>
      </div>
    </div>
  );
}
