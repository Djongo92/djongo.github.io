import React, { useMemo, useState } from 'react';
import { platformData, committeeRosters, Company } from '@/data/platform';
import { cn } from '@/lib/utils';
import { Network, Handshake, Landmark, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type EdgeType = 'matchmaking' | 'committee';
interface GraphEdge { source: string; target: string; type: EdgeType; label: string }
interface GraphNode { id: string; x: number; y: number; company: Company }

const LIFECYCLE_COLOR: Record<string, string> = {
  active: '#10b981',
  renewing: '#f59e0b',
  'at-risk': 'var(--destructive)',
  onboarding: 'var(--accent)',
};

const WIDTH = 900;
const HEIGHT = 560;

// Sector-clustered, force-relaxed layout — hand-rolled rather than a graph
// library, in the same dependency-free spirit as Sparkline/TrendChart. Nodes
// start jittered around their sector's cluster point (a far better seed than
// pure random) and a short repulsion/attraction/centering relaxation settles
// them once; the result is memoized so it never re-runs mid-interaction.
function layoutGraph(nodes: Company[], edges: GraphEdge[]): GraphNode[] {
  const sectors = Array.from(new Set(nodes.map(n => n.sector)));
  const clusterCenters = new Map<string, { x: number; y: number }>();
  sectors.forEach((s, i) => {
    const angle = (i / sectors.length) * Math.PI * 2;
    clusterCenters.set(s, {
      x: WIDTH / 2 + Math.cos(angle) * (WIDTH * 0.32),
      y: HEIGHT / 2 + Math.sin(angle) * (HEIGHT * 0.32),
    });
  });

  const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const positions: GraphNode[] = nodes.map(c => {
    const center = clusterCenters.get(c.sector)!;
    const jitterAngle = (hash(c.id) % 360) * (Math.PI / 180);
    const jitterR = 40 + (hash(c.id + 'r') % 60);
    return { id: c.id, company: c, x: center.x + Math.cos(jitterAngle) * jitterR, y: center.y + Math.sin(jitterAngle) * jitterR };
  });

  const byId = new Map(positions.map(p => [p.id, p]));
  const REPULSION = 1800;
  const SPRING = 0.02;
  const REST_LENGTH = 90;
  const CENTER_PULL = 0.01;

  for (let iter = 0; iter < 120; iter++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i], b = positions[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 140) {
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.x += fx; a.y += fy;
          b.x -= fx; b.y -= fy;
        }
      }
    }
    for (const e of edges) {
      const a = byId.get(e.source), b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - REST_LENGTH) * SPRING;
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      a.x += fx; a.y += fy;
      b.x -= fx; b.y -= fy;
    }
    for (const p of positions) {
      p.x += (WIDTH / 2 - p.x) * CENTER_PULL;
      p.y += (HEIGHT / 2 - p.y) * CENTER_PULL;
      p.x = Math.max(30, Math.min(WIDTH - 30, p.x));
      p.y = Math.max(30, Math.min(HEIGHT - 30, p.y));
    }
  }

  return positions;
}

function buildEdges(): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const pairs = (platformData.console as any).matchmaking?.pairs || [];
  const deals = (platformData.console as any).matchmaking?.deals || [];
  for (const p of pairs) edges.push({ source: p.from, target: p.to, type: 'matchmaking', label: p.rationale });
  for (const d of deals) if (d.outcome === 'closed') edges.push({ source: d.from, target: d.to, type: 'matchmaking', label: `Closed deal: ${d.value}` });
  for (const c of committeeRosters) {
    for (const memberId of c.memberCompanyIds) {
      edges.push({ source: c.chairCompanyId, target: memberId, type: 'committee', label: `${c.name} committee` });
    }
  }
  return edges;
}

export function NetworkView({ navigateTo }: { navigateTo: (v: string, c?: string) => void }) {
  const [filter, setFilter] = useState<'all' | EdgeType>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ node: GraphNode; connections: { id: string; name: string; label: string }[] } | null>(null);

  const members = platformData.allMembers;
  const allEdges = useMemo(buildEdges, []);
  const nodes = useMemo(() => layoutGraph(members, allEdges), [members, allEdges]);
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const visibleEdges = filter === 'all' ? allEdges : allEdges.filter(e => e.type === filter);
  const connectedIds = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set<string>([hoveredId]);
    for (const e of visibleEdges) {
      if (e.source === hoveredId) set.add(e.target);
      if (e.target === hoveredId) set.add(e.source);
    }
    return set;
  }, [hoveredId, visibleEdges]);

  const openNode = (n: GraphNode) => {
    const connections = allEdges
      .filter(e => e.source === n.id || e.target === n.id)
      .map(e => {
        const otherId = e.source === n.id ? e.target : e.source;
        const other = members.find(m => m.id === otherId);
        return other ? { id: other.id, name: other.name, label: e.label } : null;
      })
      .filter((x): x is { id: string; name: string; label: string } => !!x);
    setSelected({ node: n, connections });
  };

  return (
    <div className="max-w-6xl mx-auto font-sans pb-20">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2 flex items-center gap-3"><Network className="w-8 h-8 text-primary" /> Network</h2>
          <p className="text-sm font-medium text-muted-foreground max-w-2xl">How the book connects — matchmaking introductions and shared committee seats across all {members.length} members.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border/50 shadow-inner">
          {([
            { key: 'all', label: 'All Ties' },
            { key: 'matchmaking', label: 'Matchmaking' },
            { key: 'committee', label: 'Committees' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={cn("px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors", filter === f.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-[40px] shadow-sm p-4 md:p-8 relative overflow-hidden">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label="Member relationship network">
          {visibleEdges.map((e, i) => {
            const a = byId.get(e.source), b = byId.get(e.target);
            if (!a || !b) return null;
            const dim = connectedIds && !(connectedIds.has(e.source) && connectedIds.has(e.target));
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={e.type === 'matchmaking' ? '#3b82f6' : '#a855f7'}
                strokeWidth={dim ? 1 : 1.75}
                opacity={dim ? 0.08 : 0.45}
              />
            );
          })}
          {nodes.map(n => {
            const dim = connectedIds && !connectedIds.has(n.id);
            const radius = 7 + (n.company.score / 100) * 11;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => openNode(n)}
                opacity={dim ? 0.25 : 1}
              >
                <circle r={radius} fill={LIFECYCLE_COLOR[n.company.lifecycle] || '#9ca3af'} fillOpacity={0.18} stroke={LIFECYCLE_COLOR[n.company.lifecycle] || '#9ca3af'} strokeWidth={1.5} />
                <circle r={2.5} fill={LIFECYCLE_COLOR[n.company.lifecycle] || '#9ca3af'} />
                {(hoveredId === n.id || !hoveredId) && radius > 12 && (
                  <text y={radius + 13} textAnchor="middle" className="fill-foreground text-[9px] font-bold pointer-events-none">{n.company.name.length > 18 ? n.company.name.slice(0, 16) + '…' : n.company.name}</text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {Object.entries(LIFECYCLE_COLOR).map(([key, color]) => (
            <span key={key} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /> {key}</span>
          ))}
          <span className="flex items-center gap-1.5 ml-auto"><span className="w-4 h-0.5 bg-blue-500" /> Matchmaking</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-purple-500" /> Committee</span>
          <span>Node size = score</span>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-[40px] shadow-2xl max-w-lg w-full p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-serif font-light text-foreground">{selected.node.company.name}</h3>
                    <p className="text-sm text-muted-foreground">{selected.node.company.sector} · {selected.node.company.tier} · Score {selected.node.company.score}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-border transition-colors shrink-0"><X className="w-4 h-4" /></button>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{selected.connections.length} Connection{selected.connections.length === 1 ? '' : 's'}</div>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                  {selected.connections.length === 0 && <div className="text-sm text-muted-foreground italic">No matchmaking or committee ties recorded.</div>}
                  {selected.connections.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/40 rounded-2xl px-4 py-3">
                      {c.label.toLowerCase().includes('committee') ? <Landmark className="w-4 h-4 text-purple-500 shrink-0" /> : <Handshake className="w-4 h-4 text-blue-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigateTo('accounts', selected.node.company.id)} className="w-full py-3 bg-foreground text-background font-bold text-sm rounded-full shadow-md hover:bg-foreground/90 transition-transform active:scale-95">
                  View Full Dossier
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
