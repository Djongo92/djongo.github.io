import React, { useRef, useState } from 'react';

interface TrendChartProps {
  data: { label: string; value: number }[];
  className?: string;
  height?: number;
  formatValue?: (v: number) => string;
  // Floor for the visible axis span. Averaging many companies together
  // tends to smooth out individual swings into a fraction of a point of
  // real movement — without a floor, auto-scaling to the true min/max would
  // stretch that noise to fill the whole chart and read as a dramatic trend
  // that isn't there. Defaults to 10, a reasonable "nothing much moved"
  // band on a 0-100 score/percentage scale.
  minRange?: number;
}

// A small, dependency-free line chart in the same spirit as Sparkline, but
// labeled and hoverable for the Analytics view's trend lines. Renders in a
// fixed viewBox and scales via preserveAspectRatio, so it stays crisp at any
// width without recomputing pixel coordinates on resize.
export function TrendChart({ data, className, height = 220, formatValue = (v) => `${Math.round(v)}`, minRange = 10 }: TrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length < 2) return null;

  const W = 600;
  const H = height;
  const padTop = 24;
  const padBottom = 28;
  const padX = 8;
  const values = data.map(d => d.value);
  const dataMax = Math.max(...values);
  const dataMin = Math.min(...values);
  const dataRange = dataMax - dataMin;
  const effectiveRange = Math.max(dataRange * 1.15, minRange);
  const center = (dataMax + dataMin) / 2;
  const displayMax = center + effectiveRange / 2;
  const displayMin = center - effectiveRange / 2;

  const x = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - (v - displayMin) / (displayMax - displayMin)) * (H - padTop - padBottom);

  const linePoints = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPoints = `${x(0)},${y(displayMin)} ${linePoints} ${x(data.length - 1)},${y(displayMin)}`;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((relX - padX) / (W - padX * 2)) * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const everyNth = Math.ceil(data.length / 6);
  // Axis labels get one decimal of headroom over the main formatter: when a
  // 40-company average only moves by a few tenths of a point, integer
  // rounding makes distinct high/low marks print as the same number.
  const formatAxis = (v: number) => (dataRange < 2 ? v.toFixed(1) : formatValue(v));

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible cursor-crosshair"
        style={{ height }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <line x1={padX} y1={y(dataMax)} x2={W - padX} y2={y(dataMax)} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
        <line x1={padX} y1={y(dataMin)} x2={W - padX} y2={y(dataMin)} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />

        <polygon points={areaPoints} fill="currentColor" fillOpacity={0.08} stroke="none" />
        <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        <text x={padX} y={y(dataMax) - 8} className="fill-current text-[9px] font-bold uppercase tracking-widest opacity-60">{formatAxis(dataMax)}</text>
        <text x={padX} y={y(dataMin) + 16} className="fill-current text-[9px] font-bold uppercase tracking-widest opacity-60">{formatAxis(dataMin)}</text>

        {data.map((d, i) => (i % everyNth === 0 || i === data.length - 1) && (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === data.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'} className="fill-current text-[9px] font-bold uppercase tracking-widest opacity-50">{d.label}</text>
        ))}

        {hovered && hoverIndex !== null && (
          <>
            <line x1={x(hoverIndex)} y1={padTop} x2={x(hoverIndex)} y2={H - padBottom} stroke="currentColor" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="3,3" />
            <circle cx={x(hoverIndex)} cy={y(hovered.value)} r={4.5} fill="currentColor" stroke="var(--background, white)" strokeWidth={2} />
          </>
        )}
      </svg>
      {hovered && (
        <div className="flex items-center justify-between text-xs font-bold mt-1 px-1">
          <span className="text-muted-foreground uppercase tracking-widest text-[10px]">{hovered.label}</span>
          <span className="tabular-nums text-foreground">{dataRange < 2 ? hovered.value.toFixed(1) : formatValue(hovered.value)}</span>
        </div>
      )}
    </div>
  );
}
