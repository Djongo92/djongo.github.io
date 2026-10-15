import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { useState } from 'react';
import { TRACKED_FIRMS } from '../data/trackedFirms';
import { BENCHMARK_LEADERS, SCORED_FIRMS } from '../data/benchmarkLeaders';
import unscoredTrackedFirms from '../data/unscoredTrackedFirms.json';
import { classifyFirm } from '../lib/firmCheckStatus.mjs';
import { site } from '../lib/site';

// The published benchmark leaders — the same generated data the leaderboard
// table above renders, so the checker can never drift from it.
// Scores are already on the public 0–500 scale.
const RANKED_FIRMS = BENCHMARK_LEADERS;

// Tracked firms with NO published audit yet — in the directory, but not part
// of the scored pool, so the checker must never call them "benchmarked".
const UNSCORED_NAMES = Object.keys(unscoredTrackedFirms).filter(k => k !== '_comment');

type Result =
  | { kind: 'ranked'; firm: (typeof RANKED_FIRMS)[number] }
  | { kind: 'scored'; name: string }
  | { kind: 'unscored'; name: string }
  | { kind: 'not-found'; query: string };

export function FirmChecker() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    const match = classifyFirm(trimmed, RANKED_FIRMS, TRACKED_FIRMS, UNSCORED_NAMES) as Result | null;
    setResult(match ?? { kind: 'not-found', query: trimmed });
  };

  return (
    <div className="border border-primary/20 bg-primary/5 p-8 md:p-10 rounded-2xl">
      <h3 className="text-2xl md:text-3xl font-serif text-white mb-3">
        Is your firm among the {SCORED_FIRMS} scored?
      </h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-lg">
        We score {SCORED_FIRMS} Serbia firms with published audits. The top {BENCHMARK_LEADERS.length} are
        published above &mdash; the full index is public on the leaderboard.
      </p>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-xl" data-testid="form-firm-checker">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setResult(null); }}
            placeholder="Your firm's name"
            aria-label="Your firm's name"
            data-testid="input-firm-name"
            className="w-full bg-background/60 border border-white/15 text-white placeholder:text-muted-foreground/50 pl-11 pr-4 py-4 text-sm rounded-xl focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>
        <button
          type="submit"
          data-testid="button-firm-check"
          className="inline-flex items-center justify-center gap-2 border border-primary/40 bg-primary/10 text-primary px-7 py-4 text-sm font-semibold rounded-xl hover:bg-primary/20 transition-colors whitespace-nowrap"
        >
          Check
        </button>
      </form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={
              result.kind === 'ranked'
                ? result.firm.name
                : result.kind === 'not-found'
                  ? result.query
                  : result.name
            }
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 border-t border-primary/15 pt-6"
            data-testid="text-firm-result"
          >
            {result.kind === 'ranked' ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-white font-medium mb-1">{result.firm.name}</div>
                  <div className="text-sm text-muted-foreground tabular-nums font-medium">
                    Visibility Index <span className="text-primary font-bold">#{result.firm.rank}</span> in Serbia
                    &nbsp;&bull;&nbsp; Score <span className="text-primary font-bold">{result.firm.score}</span>/500
                  </div>
                </div>
                <a
                  href={site("/app/teaser")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider hover:text-white transition-colors shrink-0"
                >
                  Claim your profile <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ) : result.kind === 'scored' ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-white font-medium mb-1">{result.name}</div>
                  <div className="text-sm text-muted-foreground">
                    You're scored &mdash; one of the {SCORED_FIRMS} Serbia firms with a published
                    audit. Run the free audit for your full category breakdown.
                  </div>
                </div>
                <a
                  href={site("/app/teaser")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider hover:text-white transition-colors shrink-0"
                >
                  Reveal Your Score <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ) : result.kind === 'unscored' ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-white font-medium mb-1">{result.name}</div>
                  <div className="text-sm text-muted-foreground">
                    We're already tracking your firm &mdash; no published audit yet.
                    Run a free audit to get scored and join the {SCORED_FIRMS}-firm benchmark.
                  </div>
                </div>
                <a
                  href={site("/app/teaser")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider hover:text-white transition-colors shrink-0"
                >
                  Run Free Audit <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-white font-medium mb-1">Not among the {SCORED_FIRMS} scored firms yet.</div>
                  <div className="text-sm text-muted-foreground">
                    Run a free audit to get scored and see exactly where you'd stand
                    against the benchmarked field.
                  </div>
                </div>
                <a
                  href={site("/app/teaser")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider hover:text-white transition-colors shrink-0"
                >
                  Run Free Audit <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
