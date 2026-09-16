import React from 'react';
import { SEO } from '@/components/seo';
import { CheckCircle2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const SERVICES = [
  { name: 'Member Portal', uptime: '99.99%' },
  { name: 'Staff Console', uptime: '99.97%' },
  { name: 'Ask (Compass query engine)', uptime: '99.95%' },
  { name: 'Directory & Matchmaking', uptime: '99.98%' },
  { name: 'Notifications & Digests', uptime: '99.99%' },
  { name: 'Reports & Exports', uptime: '100.00%' },
];

const INCIDENTS = [
  { date: 'Aug 14, 2026', title: 'Elevated latency on Ask query engine', duration: '18 min', status: 'Resolved' },
  { date: 'Jun 2, 2026', title: 'Delayed digest email delivery', duration: '42 min', status: 'Resolved' },
  { date: 'Mar 27, 2026', title: 'Scheduled maintenance — directory sync', duration: '2 hr', status: 'Resolved' },
];

export default function StatusPage() {
  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title="System Status" description="Live operational status for the AmCham Serbia member portal, staff console, and platform services." />

      <section className="bg-secondary text-secondary-foreground py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">All Systems Operational</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">System Status</h1>
          <p className="text-base md:text-lg text-secondary-foreground/70 max-w-2xl">Live status for the AmCham OS platform — member portal, staff console, and the services behind them.</p>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-8 -mt-10 relative z-10">
        <div className="bg-card border border-border rounded-[32px] shadow-lg p-6 md:p-10">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
            <div className="text-sm font-bold text-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Services</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">99.98% uptime · last 90 days</div>
          </div>
          <div className="divide-y divide-border">
            {SERVICES.map(s => (
              <div key={s.name} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-muted-foreground tabular-nums">{s.uptime}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">Operational</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[32px] shadow-sm p-6 md:p-10 mt-8">
          <div className="text-sm font-bold text-foreground mb-8">Incident History</div>
          <div className="space-y-4">
            {INCIDENTS.map((inc, i) => (
              <div key={i} className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 rounded-2xl bg-muted/30 border border-border/50")}>
                <div>
                  <div className="text-sm font-bold text-foreground">{inc.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{inc.date} · {inc.duration}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full w-fit"><CheckCircle2 className="w-3 h-3" /> {inc.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
