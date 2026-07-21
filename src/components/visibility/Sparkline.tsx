// A minimal inline trend line for a category score history — deliberately
// tiny and axis-less (this sits inside a score card, not a chart section;
// Analytics already has the full labeled version of this story).
interface SparklineProps {
  values: number[];
  colorClass?: string;
  width?: number;
  height?: number;
}

const Sparkline = ({ values, colorClass = "stroke-emerald-500", width = 64, height = 20 }: SparklineProps) => {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden>
      <polyline
        points={points}
        fill="none"
        className={colorClass}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Sparkline;
