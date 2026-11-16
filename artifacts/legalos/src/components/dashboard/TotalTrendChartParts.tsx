// Pieces of the Command Center's "Score over time" chart.

/** What recharts passes a custom tooltip. */
type ChartTooltipProps = { active?: boolean; payload?: Array<{ payload?: unknown }>; label?: string | number };
/** What recharts passes a custom dot renderer. */
type ChartDotProps = { cx?: number; cy?: number; payload?: { confidenceScore?: number | null } };

/** Custom recharts tooltip for the headline "Score over time" chart — adds
 *  that snapshot's rolled-up confidence so a dip can be read as "your own
 *  score changed" vs. "this point came from a thin peer sample" without
 *  leaving the dashboard. Mirrors Analytics.tsx's CategoryTrendTooltip. */
export const TotalTrendTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as { score500: number; confidenceScore: number | null; sampleSize: number | null } | undefined;
  if (!point) return null;
  const lowConfidence = point.confidenceScore != null && point.confidenceScore < 1;
  return (
    <div
      className="text-xs font-body rounded-sm px-3 py-2"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-foreground font-medium">{point.score500} / 500</p>
      {point.confidenceScore != null && (
        <p className={`mt-0.5 ${lowConfidence ? "text-amber-500" : "text-muted-foreground"}`}>
          {Math.round(point.confidenceScore * 100)}% confidence
          {point.sampleSize != null ? ` · smallest sample ${point.sampleSize} firms` : ""}
        </p>
      )}
    </div>
  );
};

/** Hollow amber ring flags a point recorded when that audit's peer-normalized
 *  metrics were thin-sampled (confidenceScore < 1) — same treatment as
 *  Analytics.tsx's CategoryTrendDot. */
export const TotalTrendDot = (props: ChartDotProps) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const lowConfidence = payload?.confidenceScore != null && payload.confidenceScore < 1;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill={lowConfidence ? "hsl(var(--card))" : "rgb(16 185 129)"}
      stroke={lowConfidence ? "rgb(245 158 11)" : "rgb(16 185 129)"}
      strokeWidth={lowConfidence ? 2 : 1}
    />
  );
};
