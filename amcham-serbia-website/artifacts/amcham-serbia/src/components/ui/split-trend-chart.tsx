import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useElementWidth } from './trend-chart';

export interface SplitSeries {
  key: string;
  label: string;
  values: number[];
  color: string;
  reference?: boolean;
}

interface SplitTrendChartProps {
  labels: string[];
  series: SplitSeries[];
  marker?: { index: number; text: string };
  height?: number;
  formatValue?: (v: number) => string;
}

const PAD_BASE = { top: 30, right: 132, bottom: 30, left: 34 };
const MIN_TICK_GAP = 72;
const END_LABEL_GAP = 18;

// Multi-series sibling of TrendChart: one shared y-scale, lines labelled at
// their ends, an optional vertical marker, and a crosshair readout.
export function SplitTrendChart({ labels, series, marker, height = 300, formatValue = (v) => `${Math.round(v)}` }: SplitTrendChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const n = labels.length;
  if (n < 2) return null;
  const PAD = { ...PAD_BASE, right: width < 520 ? 96 : PAD_BASE.right };

  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const lo = Math.floor((Math.min(...all) - 2) / 10) * 10;
  const hi = Math.ceil((Math.max(...all) + 2) / 10) * 10;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 10) ticks.push(t);

  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;
  const pathFor = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  // End labels sit at each line's last value, nudged apart so they never overlap.
  const ends = series
    .map((s) => ({ s, y: y(s.values[n - 1]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < END_LABEL_GAP) ends[i].y = ends[i - 1].y + END_LABEL_GAP;
  }

  const labelEvery = Math.ceil(n / Math.max(2, Math.floor(plotW / 90)));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - rect.left - PAD.left;
    setHover(Math.max(0, Math.min(n - 1, Math.round((rel / plotW) * (n - 1)))));
  };

  const tooltipLeft = hover !== null ? Math.min(Math.max(x(hover) + 12, 0), width - 190) : 0;

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block overflow-visible touch-none cursor-crosshair"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={series.map((s) => `${s.label}: ${formatValue(s.values[0])} to ${formatValue(s.values[n - 1])}`).join('; ')}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} className="stroke-foreground" strokeOpacity={t === lo ? 0.18 : 0.07} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground text-[10px] font-semibold tabular-nums">{t}</text>
          </g>
        ))}

        {labels.map((l, i) => (i === 0 || i === n - 1 || (i % labelEvery === 0 && x(i) - x(0) >= MIN_TICK_GAP && x(n - 1) - x(i) >= MIN_TICK_GAP)) && (
          <text key={l} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="fill-muted-foreground text-[10px] font-semibold uppercase tracking-wider">{l}</text>
        ))}

        {marker && (
          <g>
            <line x1={x(marker.index)} x2={x(marker.index)} y1={PAD.top - 6} y2={PAD.top + plotH} className="stroke-foreground" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="2 4" />
            <text x={x(marker.index)} y={PAD.top - 12} textAnchor="middle" className="fill-foreground text-[10px] font-bold uppercase tracking-widest">{marker.text}</text>
          </g>
        )}

        {series.map((s, si) => (
          <motion.path
            key={s.key}
            d={pathFor(s.values)}
            fill="none"
            stroke={s.reference ? undefined : s.color}
            className={s.reference ? 'stroke-muted-foreground' : undefined}
            strokeOpacity={s.reference ? 0.6 : 1}
            strokeWidth={s.reference ? 1.5 : 2}
            strokeDasharray={s.reference ? '5 5' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.15 * si, ease: 'easeInOut' }}
          />
        ))}

        {ends.map(({ s, y: ly }) => (
          <g key={s.key}>
            <circle cx={x(n - 1)} cy={y(s.values[n - 1])} r={4} fill={s.reference ? 'currentColor' : s.color} className={s.reference ? 'text-muted-foreground' : undefined} stroke="hsl(var(--card))" strokeWidth={2} />
            <text x={x(n - 1) + 12} y={ly + 4} className="fill-foreground text-[11px] font-bold">
              {s.label} <tspan className="fill-muted-foreground font-semibold tabular-nums">{formatValue(s.values[n - 1])}</tspan>
            </text>
          </g>
        ))}

        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} className="stroke-foreground" strokeOpacity={0.25} strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={s.reference ? 'currentColor' : s.color} className={s.reference ? 'text-muted-foreground' : undefined} stroke="hsl(var(--card))" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>

      {hover !== null && (
        <div className="pointer-events-none absolute top-6 w-[180px] rounded-xl border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg text-xs" style={{ left: tooltipLeft }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3 py-0.5">
              <span className="flex items-center gap-1.5 text-foreground font-semibold">
                <span className={s.reference ? 'w-3 border-t border-dashed border-muted-foreground' : 'w-3 h-0.5 rounded-full'} style={s.reference ? undefined : { background: s.color }} />
                {s.label}
              </span>
              <span className="tabular-nums font-bold text-foreground">{formatValue(s.values[hover])}</span>
            </div>
          ))}
        </div>
      )}

      <table className="sr-only">
        <caption>Monthly values by series</caption>
        <thead><tr><th>Month</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>{labels.map((l, i) => <tr key={l}><td>{l}</td>{series.map((s) => <td key={s.key}>{formatValue(s.values[i])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
