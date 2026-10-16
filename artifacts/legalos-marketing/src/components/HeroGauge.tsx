/**
 * HeroGauge — animated gauge mark for the marketing hero.
 *
 * variant="panel" (default): full 280px gauge with card chrome.
 * variant="float": compact floating card with AnimatedLogoMark + counting
 *   score number — sits overlaid on the hero photo.
 *
 * Both variants share the same rAF-driven score counter and needle logic.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatedLogoMark } from '@/components/Logo';

// ─── Score + needle configuration ───────────────────────────────────────────
const TARGET_SCORE = 284;
const MAX_SCORE    = 500;
const CYCLE_S      = 5;
const CLIMB_END    = 0.55;
const HOLD_END     = 0.75;

const SWEEP_RANGE  = 152;
const SWEEP_START  = -76;
const TARGET_DEG   = SWEEP_START + (TARGET_SCORE / MAX_SCORE) * SWEEP_RANGE;

const CSS = `
@keyframes uvid-hero-glow {
  0%, 100% { opacity: 0.08; }
  ${HOLD_END * 100}% { opacity: 0.22; }
}
@keyframes uvid-hero-arc {
  0%                    { stroke-dashoffset: 160; opacity: 0.2; }
  ${CLIMB_END * 100}%   { stroke-dashoffset: ${160 - 160 * (TARGET_SCORE / MAX_SCORE)}; opacity: 1; }
  ${HOLD_END * 100}%    { stroke-dashoffset: ${160 - 160 * (TARGET_SCORE / MAX_SCORE)}; opacity: 1; }
  97%, 100%             { stroke-dashoffset: 160; opacity: 0.2; }
}
@keyframes uvid-hero-ticks {
  0%, 8%                { opacity: 0; }
  25%, ${HOLD_END * 100}% { opacity: 1; }
  95%, 100%             { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .uvid-hero-needle { transform: rotate(${TARGET_DEG}deg) !important; transition: none !important; }
  .uvid-hero-arc    { animation: none !important; stroke-dashoffset: ${160 - 160 * (TARGET_SCORE / MAX_SCORE)} !important; opacity: 1 !important; }
  .uvid-hero-glow, .uvid-hero-ticks { animation: none !important; opacity: 1 !important; }
}
`;

let _styleInjected = false;
function injectStyle() {
  if (_styleInjected || typeof document === 'undefined') return;
  _styleInjected = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function useGaugeState(cycleDuration: number) {
  const [needleDeg, setNeedleDeg] = useState(SWEEP_START);
  const [score,     setScore]     = useState(0);
  const cycleStart = useRef<number | null>(null);
  const raf        = useRef(0);

  useEffect(() => {
    injectStyle();
    const tick = (now: number) => {
      if (!cycleStart.current) cycleStart.current = now;
      const t = ((now - cycleStart.current) / 1000) / cycleDuration;

      let fraction = 0;
      if      (t < CLIMB_END) fraction = easeInOut(t / CLIMB_END);
      else if (t < HOLD_END)  fraction = 1;
      // snap back between HOLD_END and 1

      setNeedleDeg(SWEEP_START + fraction * (TARGET_DEG - SWEEP_START));
      setScore(Math.round(fraction * TARGET_SCORE));

      if (t >= 1) cycleStart.current = now;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [cycleDuration]);

  return { needleDeg, score };
}

// ─── Float variant ───────────────────────────────────────────────────────────
function FloatCard({ score }: { score: number }) {
  return (
    <div className="bg-background/90 border border-border backdrop-blur-2xl flex flex-col items-center gap-1.5 rounded-2xl"
      style={{ padding: '20px 28px', minWidth: 188 }}>
      {/* Animated logo mark */}
      <AnimatedLogoMark className="w-9 h-9 text-primary" />
      {/* Score number */}
      <div className="font-serif text-[3.8rem] font-semibold text-white leading-none tabular-nums mt-0.5">
        {score}
      </div>
      {/* Score label */}
      <div className="eyebrow text-[9px] text-primary tracking-widest">
        MARKET VISIBILITY SCORE / 500
      </div>
      {/* Gold rule */}
      <div className="w-full h-px mt-1"
        style={{ background: 'linear-gradient(to right, hsl(var(--primary)), transparent)' }} />
      {/* Benchmark */}
      <div className="eyebrow text-[9px] text-muted-foreground/55 tracking-widest">
        BENCHMARK: TOP 15%
      </div>
    </div>
  );
}

// ─── Panel variant (existing full gauge) ─────────────────────────────────────
function PanelGauge({ size, needleDeg, score }: { size: number; needleDeg: number; score: number }) {
  return (
    <div className="relative p-6 sm:p-8 md:p-12 bg-card/20 backdrop-blur-2xl border border-border/50 rounded-3xl">
      <div className="flex justify-center">
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
          xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <circle cx="50" cy="60" r="36" fill="hsl(var(--primary))" fillOpacity="0.1"
            style={{ animation: `uvid-hero-glow ${CYCLE_S}s ease-in-out infinite` }} />
          <path d="M13 72 A42 42 0 1 1 87 72"
            stroke="hsl(var(--primary))" strokeWidth="3"
            strokeLinecap="square" strokeDasharray="3 7" opacity="0.3" />
          <path d="M22 72 A32 32 0 1 1 78 72"
            stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
            className="uvid-hero-arc" pathLength="160" />
          <g style={{ animation: `uvid-hero-ticks ${CYCLE_S}s ease-in-out infinite` }}
            stroke="hsl(var(--primary))" strokeLinecap="square">
            <line x1="13" y1="72" x2="16.5" y2="72" strokeWidth="2" />
            <line x1="22" y1="38.5" x2="24.7" y2="41.2" strokeWidth="2" />
            <line x1="50" y1="28" x2="50" y2="31.5" strokeWidth="2" />
            <line x1="78" y1="38.5" x2="75.3" y2="41.2" strokeWidth="2" />
            <line x1="87" y1="72" x2="83.5" y2="72" strokeWidth="2" />
          </g>
          <path d="M39 30 V58 A11 11 0 0 0 61 58 V30"
            stroke="hsl(var(--primary))" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <g style={{ transformOrigin: '50px 50px', transform: `rotate(${needleDeg}deg)`, transition: 'transform 0.05s linear' }}>
            <line x1="50" y1="50" x2="50" y2="22"
              stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="50" y1="50" x2="50" y2="59"
              stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.45" />
          </g>
          <circle cx="50" cy="50" r="5"
            fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2.5" />
        </svg>
      </div>

      <div className="flex flex-col items-center mt-2 mb-4">
        <div className="font-serif text-6xl font-semibold text-white leading-none tabular-nums">
          {score}
        </div>
        <div className="text-xs text-muted-foreground/60 eyebrow mt-2">MARKET VISIBILITY SCORE / 500</div>
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-white/10 pt-4 gap-6 tabular-nums font-medium">
        <span>UPDATED: Q3 2026</span>
        <span className="text-primary">BENCHMARK: TOP 15%</span>
      </div>
    </div>
  );
}

// ─── Public export ───────────────────────────────────────────────────────────
interface HeroGaugeProps {
  size?:    number;
  variant?: 'panel' | 'float';
}

export function HeroGauge({ size = 280, variant = 'panel' }: HeroGaugeProps) {
  const { needleDeg, score } = useGaugeState(CYCLE_S);

  if (variant === 'float') return <FloatCard score={score} />;
  return <PanelGauge size={size} needleDeg={needleDeg} score={score} />;
}
