// Where a firm sits among its peer group, as a real position marker — not
// a fabricated bell curve. The audit only ever computes a percentile rank
// (see computePercentile in _shared/runVisibilityAudit.ts), never each
// peer's individual score, so a real distribution shape isn't something
// this data can honestly show. A marker on a 0-100 track is the most
// truthful visual this data supports.
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
