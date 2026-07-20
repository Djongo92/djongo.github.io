import { useEffect, useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { isDemoMode } from "@/lib/demoMode";
import { DEMO_STRATEGY_BRIEF } from "@/data/demoData";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface StrategyBrief {
  headline: string;
  narrative: string;
}

interface Params {
  domain: string;
  market: string;
  peerGroup: string;
  totalScore: number;
  categories: Record<string, { score: number; max: number; provenance: string }>;
  siteHealthIssues: string[];
}

/**
 * AI-written synthesis of the visibility score — layered on top of the
 * verified score, never replacing it. Demo mode never calls the real
 * backend (matches its "entirely local" promise), so it just returns a
 * fixed sample brief instead.
 */
export function useStrategyBrief(params: Params | null) {
  const [brief, setBrief] = useState<StrategyBrief | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params) {
      setBrief(null);
      return;
    }
    if (isDemoMode()) {
      setBrief(DEMO_STRATEGY_BRIEF);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-narrative`, {
          method: "POST",
          headers: edgeHeaders("benchmark"),
          body: JSON.stringify(params),
        });
        const data = await resp.json();
        if (!cancelled && resp.ok) setBrief(data);
      } catch {
        // Silent — the rest of the dashboard works fine without this.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.domain, params?.market, params?.totalScore]);

  return { brief, loading };
}
