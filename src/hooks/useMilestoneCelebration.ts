import { useEffect, useState } from "react";

// Round score thresholds (every 25 of the 200-point scale) and peer-percentile
// tiers worth celebrating distinctly from the routine "new personal best"
// ScoreBurst, which fires on every tiny improvement. A milestone celebrates
// exactly once ever per firm domain — tracked in localStorage, not state,
// so it survives reloads and doesn't require a backend column.
const SCORE_TIERS = [25, 50, 75, 100, 125, 150, 175, 200];
const PERCENTILE_TIERS = [50, 75, 90, 99];

export interface Milestone {
  id: string;
  kind: "score" | "percentile";
  value: number;
}

interface Baseline {
  bestPercentile: number;
  seenTiers: string[];
}

const storageKey = (domain: string) => `legalos_milestone_baseline_${domain}`;

function loadBaseline(domain: string): Baseline | null {
  try {
    const raw = localStorage.getItem(storageKey(domain));
    return raw ? (JSON.parse(raw) as Baseline) : null;
  } catch {
    return null;
  }
}

function saveBaseline(domain: string, baseline: Baseline) {
  try {
    localStorage.setItem(storageKey(domain), JSON.stringify(baseline));
  } catch {
    /* localStorage unavailable/full — celebration just won't persist, not fatal */
  }
}

/**
 * previousScore/currentScore should come from the firm's own real score
 * history (the same "previous audit vs. latest audit" comparison the
 * Command Center's own categoryDeltas card already makes) — not just any
 * two numbers — so a milestone only fires on an actual improvement between
 * two real runs, never on the very first audit a firm ever records.
 */
export function useMilestoneCelebration(
  domain: string | undefined,
  previousScore: number | null,
  currentScore: number | null,
  currentPercentile: number | null | undefined,
): { milestone: Milestone | null; dismiss: () => void } {
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (!domain || currentScore == null) return;
    const baseline = loadBaseline(domain);

    if (!baseline) {
      // First time this domain has ever been tracked here — record a silent
      // baseline rather than celebrating an "achievement" that's really just
      // the first number this firm has ever seen.
      saveBaseline(domain, { bestPercentile: currentPercentile ?? 0, seenTiers: [] });
      return;
    }

    const seen = new Set(baseline.seenTiers);
    let best: Milestone | null = null;

    if (previousScore != null) {
      for (const tier of SCORE_TIERS) {
        const id = `score_${tier}`;
        if (previousScore < tier && currentScore >= tier && !seen.has(id)) {
          best = { id, kind: "score", value: tier };
        }
      }
    }

    if (currentPercentile != null) {
      for (const tier of PERCENTILE_TIERS) {
        const id = `percentile_${tier}`;
        // Percentile milestones take priority over score milestones when both
        // land in the same update — landing in a rarer slice of the peer
        // group reads as the bigger deal of the two.
        if (baseline.bestPercentile < tier && currentPercentile >= tier && !seen.has(id)) {
          best = { id, kind: "percentile", value: tier };
        }
      }
    }

    if (best) setMilestone(best);

    if (currentPercentile != null && currentPercentile > baseline.bestPercentile) {
      saveBaseline(domain, { ...baseline, bestPercentile: currentPercentile });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, previousScore, currentScore, currentPercentile]);

  const dismiss = () => {
    if (!milestone || !domain) {
      setMilestone(null);
      return;
    }
    const baseline = loadBaseline(domain) ?? { bestPercentile: currentPercentile ?? 0, seenTiers: [] };
    saveBaseline(domain, { ...baseline, seenTiers: [...baseline.seenTiers, milestone.id] });
    setMilestone(null);
  };

  return { milestone, dismiss };
}
