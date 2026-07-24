// A real two-axis competitive map: Reputation (credibility the market
// already assigned you) vs. Thought Leadership (pure output you control),
// plotted against every OTHER firm that has opted to publish an audit in
// the same market + peer group. This is not a new privacy exposure — it
// reads the exact same `is_public = true` rows the Visibility Index
// leaderboard already displays (see VisibilityIndex.tsx), just as a richer
// 2D view of that same already-public dataset instead of a single ranked
// list. Firms that haven't published stay invisible here, same as they're
// invisible on that leaderboard.
import { useEffect, useState } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { isDemoMode } from "@/lib/demoMode";
import { DEMO_RANKINGS, DEMO_DOMAIN } from "@/data/demoData";
import { CATEGORY_META } from "@/lib/visibilityCategories";

interface Props {
  market: string;
  peerGroup: string;
  currentDomain: string;
  currentDisplayName: string | null;
  currentReputation: number;
  currentThoughtLeadership: number;
}

interface PeerPoint {
  domain: string;
  name: string;
  reputation: number;
  thoughtLeadership: number;
  isSelf: boolean;
}

// Demo mode has no real per-peer category breakdown to read (DEMO_RANKINGS
// only carries a total score, by design — see its own comment) — this
// derives a plausible, clearly-labeled-as-sample split for illustration
// only, deterministic per firm rather than random so the chart doesn't
// reshuffle on every render.
const deriveDemoPoint = (domain: string, name: string, total: number): PeerPoint => {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) hash = (hash * 31 + domain.charCodeAt(i)) & 0xffffffff;
  const wobble = ((hash % 21) - 10) / 100; // ±10%
  const reputation = Math.max(0, Math.min(CATEGORY_META.reputation.max, total * (0.42 + wobble)));
  const thoughtLeadership = Math.max(0, Math.min(CATEGORY_META.thoughtLeadership.max, total * (0.28 - wobble)));
  return { domain, name, reputation: Math.round(reputation * 10) / 10, thoughtLeadership: Math.round(thoughtLeadership * 10) / 10, isSelf: domain === DEMO_DOMAIN };
};

const PeerScatterMap = ({ market, peerGroup, currentDomain, currentDisplayName, currentReputation, currentThoughtLeadership }: Props) => {
  const [peers, setPeers] = useState<PeerPoint[] | null>(null);

  useEffect(() => {
    if (isDemoMode()) {
      setPeers(DEMO_RANKINGS.map((r) => deriveDemoPoint(r.domain, r.displayName, r.score)).filter((p) => !p.isSelf));
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("market_visibility_audits")
        .select("audited_domain, display_name, reputation_score, thought_leadership_score")
        .eq("market", market)
        .eq("peer_group", peerGroup)
        .eq("is_public", true)
        .neq("audited_domain", currentDomain);
      if (!cancelled && !error && data) {
        setPeers(
          data.map((r) => ({
            domain: r.audited_domain,
            name: r.display_name || r.audited_domain,
            reputation: r.reputation_score,
            thoughtLeadership: r.thought_leadership_score,
            isSelf: false,
          })),
        );
      } else if (!cancelled) {
        setPeers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [market, peerGroup, currentDomain]);

  if (peers === null) return null;

  const selfPoint: PeerPoint = {
    domain: currentDomain,
    name: currentDisplayName || currentDomain,
    reputation: currentReputation,
    thoughtLeadership: currentThoughtLeadership,
    isSelf: true,
  };
  const allPoints = [...peers, selfPoint];

  if (peers.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-sm p-5">
        <p className="text-xs text-muted-foreground font-body mb-3">Competitive map</p>
        <p className="text-xs text-muted-foreground font-body">
          No other published audits in your peer group yet — this fills in as more firms publish theirs.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-sm p-5">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs text-muted-foreground font-body">Competitive map</p>
        {isDemoMode() && <span className="text-[10px] text-amber-500 font-body">Sample data</span>}
      </div>
      <p className="text-[10px] text-muted-foreground font-body mb-3">
        Reputation (credibility you've earned) vs. Thought Leadership (output you control) — among published peers.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 10, right: 16, left: -20, bottom: 4 }}>
          <XAxis
            type="number"
            dataKey="thoughtLeadership"
            name="Thought Leadership"
            domain={[0, CATEGORY_META.thoughtLeadership.max]}
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            label={{ value: "Thought Leadership →", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            type="number"
            dataKey="reputation"
            name="Reputation"
            domain={[0, CATEGORY_META.reputation.max]}
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            width={30}
            label={{ value: "Reputation →", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as PeerPoint;
              return (
                <div className="bg-card border border-border rounded-sm px-3 py-2 text-xs font-body">
                  <p className="text-foreground font-medium mb-0.5">{p.isSelf ? `${p.name} (you)` : p.name}</p>
                  <p className="text-muted-foreground">Reputation {p.reputation} · Thought Leadership {p.thoughtLeadership}</p>
                </div>
              );
            }}
          />
          <Scatter data={allPoints}>
            {allPoints.map((p) => (
              <Cell key={p.domain} fill={p.isSelf ? "rgb(16 185 129)" : "hsl(var(--muted-foreground))"} fillOpacity={p.isSelf ? 1 : 0.5} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PeerScatterMap;
