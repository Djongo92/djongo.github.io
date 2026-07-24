// Where a firm sits among its peer group, as a real position marker — not
// a fabricated bell curve. The audit's own percentile computation (see
// computePercentile in _shared/runVisibilityAudit.ts) is a live query
// against every OTHER published (is_public = true) row, so it never
// materializes a full distribution of scores for firms that haven't
// opted to publish — a marker on a 0-100 track is what that computation
// alone can honestly show.
//
// Individual peer scores DO become fair to show once a firm has actually
// published — that's the same already-public data the Visibility Index
// leaderboard renders as a ranked list (see VisibilityIndex.tsx) and
// PeerScatterMap.tsx renders as a 2D competitive map. This bar stays as
// the compact single-number summary; the scatter map is the richer view
// built from that same opted-in dataset, not a new exposure of it.
interface PeerPositionBarProps {
  percentile: number;
  peerCount: number;
}

const PeerPositionBar = ({ percentile, peerCount }: PeerPositionBarProps) => {
  const pct = Math.max(0, Math.min(100, percentile));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] tracking-wider uppercase text-muted-foreground font-body">Peer position</span>
        <span className="text-xs font-body text-foreground">
          Better than <span className="text-primary font-medium">{pct}%</span> of {peerCount} peers
        </span>
      </div>
      <div className="relative w-full h-2 rounded-full bg-gradient-to-r from-muted via-muted to-emerald-500/30">
        <div
          className="absolute top-1/2 w-3 h-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary border-2 border-card shadow-sm transition-[left] duration-500"
          style={{ left: `${pct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
};

export default PeerPositionBar;
