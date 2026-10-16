// Network Intelligence (task #122): anonymised cross-firm benchmark cards
// for the Command Center. Gated behind 2+ completed audits; every stat is
// a peer-group aggregate (never another firm's identity or raw data) and
// the server refuses to compute for cohorts under 3 firms.
import { useEffect, useState } from "react";
import { Network, Lock, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { fnUrl, authHeaders } from "@/components/workshop/shared";
import { styleMemoryIdentity } from "@/lib/styleFeedback";
import { nextInsightRating, applyRating, type InsightRating } from "@/lib/insightRatings";

interface NetworkInsight {
  key: string;
  title: string;
  stat: string;
  detail: string;
  sampleSize: number;
  confidence: "emerging" | "solid";
}

interface InsightsResponse {
  gated?: boolean;
  insights?: NetworkInsight[];
  cohortSize?: number | null; // null below the privacy floor — never show the exact number
}

export function NetworkInsights({ auditCount }: { auditCount: number }) {
  const [insights, setInsights] = useState<NetworkInsight[] | null>(null);
  const [cohortSize, setCohortSize] = useState(0);
  // Per-firm usefulness ratings, keyed by the insight's stable template key.
  const [ratings, setRatings] = useState<Record<string, InsightRating>>({});

  const unlocked = auditCount >= 2;

  useEffect(() => {
    if (!unlocked) return;
    const { accessToken } = styleMemoryIdentity();
    if (!accessToken) return; // anonymous/demo: insights are account-only
    let cancelled = false;
    fetch(fnUrl("network-insights"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(styleMemoryIdentity()),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: InsightsResponse | null) => {
        if (cancelled || !data || data.gated) return;
        setInsights(data.insights ?? []);
        setCohortSize(data.cohortSize ?? 0);
      })
      .catch((e) => console.debug("NetworkInsights fetch failed (non-blocking):", e));
    fetch(fnUrl("insight-rate"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ action: "list", ...styleMemoryIdentity() }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data?.ratings) setRatings(data.ratings); })
      .catch((e) => console.debug("Insight ratings fetch failed (non-blocking):", e));
    return () => { cancelled = true; };
  }, [unlocked]);

  // Optimistic toggle: clicking the active rating clears it, the opposite
  // switches. Roll back on failure so the UI never claims a vote the server
  // didn't keep.
  const rate = async (key: string, clicked: InsightRating) => {
    const current = ratings[key];
    const next = nextInsightRating(current, clicked);
    setRatings((prev) => applyRating(prev, key, next));
    try {
      const resp = await fetch(fnUrl("insight-rate"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "rate", insightKey: key, rating: next, ...styleMemoryIdentity() }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (e) {
      console.debug("Insight rating save failed:", e);
      setRatings((prev) => applyRating(prev, key, current ?? null));
      toast.error("Couldn't save that rating — try again.");
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <h2 className="font-display text-lg text-foreground">Network Insights</h2>
        </div>
        <span className="eyebrow text-[10px] text-muted-foreground">Anonymised peer benchmarks</span>
      </div>

      {!unlocked ? (
        // Locked state — subtle, honest about what unlocks it.
        <div className="bg-card/40 border border-border/30 rounded-sm p-5 flex items-center gap-3">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground font-body">
            Unlock peer insights after your second audit — once there's a trend, we'll show how firms like yours are moving.
          </p>
        </div>
      ) : insights === null ? (
        // Loading (or failed silently) — keep the section height stable.
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card border border-border/50 rounded-sm p-5 animate-pulse">
              <div className="h-3 w-24 bg-border/50 rounded-sm mb-3" />
              <div className="h-6 w-16 bg-border/50 rounded-sm mb-2" />
              <div className="h-3 w-full bg-border/30 rounded-sm" />
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        // Cohort too small for the privacy floor — say so without numbers.
        <div className="bg-card/40 border border-border/30 rounded-sm p-5">
          <p className="text-sm text-muted-foreground font-body">
            Peer insights for your group are still gathering — they appear once enough comparable firms have measured
            {cohortSize > 0 ? " (we never show statistics from fewer than 3 firms)" : ""}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div key={insight.key} className="bg-card border border-border/50 rounded-sm p-5">
              <p className="eyebrow text-[10px] text-primary mb-2">{insight.title}</p>
              <p className="font-display text-2xl text-foreground mb-2">{insight.stat}</p>
              <p className="text-xs text-muted-foreground font-body leading-relaxed">{insight.detail}</p>
              <p className="text-[10px] text-muted-foreground/70 font-body mt-3">
                Based on {insight.sampleSize} anonymised firm{insight.sampleSize === 1 ? "" : "s"}
                {insight.confidence === "emerging" ? " · early signal" : ""}
              </p>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
                <span className="text-[10px] text-muted-foreground/70 font-body mr-auto">Useful?</span>
                <button
                  onClick={() => rate(insight.key, "useful")}
                  aria-label="Rate this insight useful"
                  title="Useful"
                  className={`p-1.5 rounded-sm border transition-colors ${ratings[insight.key] === "useful" ? "text-primary border-primary/50 bg-primary/10" : "text-muted-foreground/60 border-transparent hover:text-foreground"}`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => rate(insight.key, "not_useful")}
                  aria-label="Rate this insight not useful"
                  title="Not useful"
                  className={`p-1.5 rounded-sm border transition-colors ${ratings[insight.key] === "not_useful" ? "text-destructive border-destructive/50 bg-destructive/10" : "text-muted-foreground/60 border-transparent hover:text-foreground"}`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
