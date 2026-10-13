import React, { useMemo, useState } from 'react';
import { platformData, committeeRosters, Company } from '@/data/platform';
import { cn } from '@/lib/utils';
import { Network, Handshake, Landmark, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from 'wouter';

type EdgeType = 'matchmaking' | 'committee';
interface GraphEdge { source: string; target: string; type: EdgeType; label: string }
interface GraphNode { id: string; x: number; y: number; company: Company }

const LIFECYCLE_COLOR: Record<string, string> = {
  active: '#10b981',
  renewing: '#f59e0b',
  'at-risk': 'hsl(var(--destructive))',
  onboarding: 'hsl(var(--accent))',
};

const WIDTH = 900;
const HEIGHT = 560;

// Sector clusters on a ring. Each sector's members sit on a small circle of
// their own, so names never pile up in the middle and the sector reads at a
// glance; cross-sector ties are drawn as curves bowed toward the centre.
// Deterministic, so the picture is identical every time it is presented.
const clusterKey = (c: Company) => (c.sector === 'Banking' ? 'Finance' : c.sector);

function layoutGraph(nodes: Company[]): { nodes: GraphNode[]; sectors: { name: string; x: number; y: number; anchor: 'start' | 'middle' | 'end' }[] } {
  const groups = new Map<string, Company[]>();
  for (const c of nodes) groups.set(clusterKey(c), [...(groups.get(clusterKey(c)) || []), c]);
  const ordered = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const cx = WIDTH / 2, cy = HEIGHT / 2, rx = WIDTH / 2 - 120, ry = HEIGHT / 2 - 95;
  const out: GraphNode[] = [];
  const sectors: { name: string; x: number; y: number; anchor: 'start' | 'middle' | 'end' }[] = [];
  ordered.forEach(([name, members], i) => {
    const angle = (i / ordered.length) * Math.PI * 2 - Math.PI / 2;
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const gx = cx + ux * rx, gy = cy + uy * ry;
    const r = members.length === 1 ? 0 : Math.min(62, 16 + members.length * 6);
    [...members].sort((a, b) => b.score - a.score).forEach((c, j) => {
      const a = (j / members.length) * Math.PI * 2 + angle;
      out.push({ id: c.id, company: c, x: gx + Math.cos(a) * r, y: gy + Math.sin(a) * r });
    });
    const lr = r + 30;
    sectors.push({ name, x: gx + ux * lr, y: gy + uy * lr + 4, anchor: Math.abs(ux) < 0.3 ? 'middle' : ux > 0 ? 'start' : 'end' });
  });
  return { nodes: out, sectors };
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
  const [hoverId, setHoveredId] = useState<string | null>(null);
  // ?focus=<id> pins a member's ties on arrival (the Showcase uses this).
  const pinnedId = new URLSearchParams(useSearch()).get('focus');
  const hoveredId = hoverId ?? pinnedId;
  const [selected, setSelected] = useState<{ node: GraphNode; connections: { id: string; name: string; label: string }[] } | null>(null);

  const members = platformData.allMembers;
  const allEdges = useMemo(buildEdges, []);
  const { nodes, sectors } = useMemo(() => layoutGraph(members), [members]);
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
          <p className="text-sm font-medium text-muted-foreground max-w-2xl">How members connect — matchmaking introductions and shared committee seats across all {members.length} members.</p>
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
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const qx = mx + (WIDTH / 2 - mx) * 0.45, qy = my + (HEIGHT / 2 - my) * 0.45;
            const lit = connectedIds && !dim;
            return (
              <path
                key={i}
                d={`M${a.x},${a.y} Q${qx},${qy} ${b.x},${b.y}`}
                fill="none"
                stroke={e.type === 'matchmaking' ? '#3b82f6' : '#a855f7'}
                strokeWidth={lit ? 2.5 : 1.5}
                opacity={dim ? 0.06 : lit ? 0.9 : 0.4}
              />
            );
          })}
          {sectors.map(sec => (
            <text key={sec.name} x={sec.x} y={sec.y} textAnchor={sec.anchor} className="fill-muted-foreground text-[11px] font-bold uppercase tracking-wider pointer-events-none" opacity={hoveredId ? 0.35 : 1}>{sec.name}</text>
          ))}
          {nodes.map(n => {
            const dim = connectedIds && !connectedIds.has(n.id);
            const radius = 5 + (n.company.score / 100) * 8;
            const showLabel = hoveredId === n.id || (connectedIds?.has(n.id) ?? false);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(n.id)}
                onBlur={() => setHoveredId(null)}
                onClick={() => openNode(n)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNode(n); } }}
                tabIndex={0}
                role="button"
                aria-label={`${n.company.name}, ${n.company.sector}, score ${n.company.score}`}
                style={{ outline: 'none' }}
                opacity={dim ? 0.25 : 1}
              >
                <circle r={radius} fill={LIFECYCLE_COLOR[n.company.lifecycle] || '#9ca3af'} fillOpacity={0.18} stroke={LIFECYCLE_COLOR[n.company.lifecycle] || '#9ca3af'} strokeWidth={1.5} />
                <circle r={2.5} fill={LIFECYCLE_COLOR[n.company.lifecycle] || '#9ca3af'} />
                <circle r={radius + 6} fill="transparent" />
                {showLabel && (
                  <text y={-radius - 7} textAnchor="middle" paintOrder="stroke" stroke="hsl(var(--card))" strokeWidth={4} className="fill-foreground text-[12px] font-bold pointer-events-none">{n.company.name}</text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          {Object.entries(LIFECYCLE_COLOR).map(([key, color]) => (
            <span key={key} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /> {key}</span>
          ))}
          <span className="flex items-center gap-1.5 ml-auto"><span className="w-4 h-0.5 bg-blue-500" /> Matchmaking</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-purple-500" /> Committee</span>
          <span>Node size = score</span>
          <span className="w-full normal-case tracking-normal font-medium">Hover or tab to a member to see its name and ties; click for the full list.</span>
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
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{selected.connections.length} Connection{selected.connections.length === 1 ? '' : 's'}</div>
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
