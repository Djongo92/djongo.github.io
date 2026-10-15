import { motion } from 'framer-motion';
import { DATA_PERIOD, SCORE_DISTRIBUTION, SCORED_FIRMS } from '../data/benchmarkLeaders';

// Score distribution of the scored Serbia census firms, on the public 0–500
// scale. Counts are GENERATED from the census leaderboard snapshot (see
// scripts/generate-benchmark-leaders.mjs) so the chart can never drift from
// the leaderboard next to it. The market's long tail is the point — most
// firms have almost no measurable web presence. Zero-count buckets still
// render (empty bars) so that story stays visible.
const MAX = Math.max(...SCORE_DISTRIBUTION.map(b => b.count), 1);

export function Histogram() {
  return (
    <div className="border border-white/5 bg-card/20 backdrop-blur-xl p-6 md:p-8 rounded-2xl">
      <div className="flex items-baseline justify-between mb-8">
        <span className="text-xs text-muted-foreground eyebrow">
          Score Distribution &mdash; {SCORED_FIRMS} Scored Serbia Firms
        </span>
        <span className="text-xs text-primary tabular-nums font-medium">{DATA_PERIOD}</span>
      </div>

      <div className="flex items-end gap-2 md:gap-3 h-40">
        {SCORE_DISTRIBUTION.map((bucket, i) => {
          const isTop = i >= SCORE_DISTRIBUTION.length - 2;
          return (
            <div key={bucket.range} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-xs text-white/70 tabular-nums font-medium">{bucket.count}</span>
              <motion.div
                className={`w-full ${isTop ? 'bg-primary' : 'bg-primary/25'}`}
                initial={{ height: 0 }}
                whileInView={{ height: `${(bucket.count / MAX) * 100}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: 'easeOut' }}
              />
              <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap tabular-nums font-medium">
                {bucket.range}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 text-xs text-muted-foreground tabular-nums font-medium">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-primary/25 inline-block" />
          The long tail &mdash; firms trailing the market leaders
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-primary inline-block" />
          Market leaders score 310+
        </span>
      </div>
    </div>
  );
}
