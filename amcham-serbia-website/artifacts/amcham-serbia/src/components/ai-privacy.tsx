import React from 'react';
import { Server, EyeOff, Globe, ArrowRight, Lock, Check, X } from 'lucide-react';
import { AI_TIERS, DATA_CLASSES, TierId } from '@/data/proposal';
import { cn } from '@/lib/utils';

// Shared visuals for "how AI handles your data": used by the proposal page
// and by Privacy & Sharing, so the two never describe the system differently.

export const TIER_STYLE: Record<TierId, { icon: React.ElementType; chip: string; ring: string; dot: string }> = {
  'on-prem': { icon: Server, chip: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-500/30', ring: 'border-emerald-500/40', dot: 'bg-emerald-500' },
  anonymised: { icon: EyeOff, chip: 'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30', ring: 'border-amber-500/40', dot: 'bg-amber-500' },
  public: { icon: Globe, chip: 'bg-sky-500/12 text-sky-800 dark:text-sky-300 border-sky-500/30', ring: 'border-sky-500/40', dot: 'bg-sky-500' },
};

export function TierChip({ tier, className }: { tier: TierId; className?: string }) {
  const t = AI_TIERS.find((x) => x.id === tier)!;
  const s = TIER_STYLE[tier];
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap', s.chip, className)}>
      <Icon className="w-3.5 h-3.5" /> {t.short}
    </span>
  );
}

export function TierCards({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {AI_TIERS.map((tier, i) => {
        const s = TIER_STYLE[tier.id];
        const Icon = s.icon;
        return (
          <div key={tier.id} className={cn('rounded-2xl border-2 bg-card p-6 flex flex-col gap-3', s.ring)}>
            <div className="flex items-center justify-between">
              <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', s.chip)}><Icon className="w-5 h-5" /></span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tier {i + 1}</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-foreground">{tier.name}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{tier.where}</p>
            <dl className="text-sm space-y-2 mt-auto pt-3 border-t border-border">
              <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sees</dt><dd className="text-foreground">{tier.sees}</dd></div>
              <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Used for</dt><dd className="text-foreground">{tier.usedFor}</dd></div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

// One real request, shown as each tier would receive it. The point lands
// faster as an example than as a rule.
const ROUTE_EXAMPLE: { tier: TierId; payload: React.ReactNode; verdict: 'full' | 'redacted' | 'blocked'; note: string }[] = [
  {
    tier: 'on-prem',
    verdict: 'full',
    note: 'Full record, because it never leaves AmCham.',
    payload: <>Adriatica Grupa · Patron · <b>€18k</b> renewal · score 62 (−15 since March) · contact <b>Marija Jovanović</b></>,
  },
  {
    tier: 'anonymised',
    verdict: 'redacted',
    note: 'Only if a stronger model is needed. Names restored on the way back.',
    payload: <><b>[COMPANY_1]</b> · Patron · <b>[AMOUNT_1]</b> renewal · score 62 (−15 since March) · contact <b>[PERSON_1]</b></>,
  },
  {
    tier: 'public',
    verdict: 'blocked',
    note: 'Refused: the request contains member data.',
    payload: <span className="line-through opacity-60">Adriatica Grupa · €18k · Marija Jovanović</span>,
  },
];

export function RouterExample() {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_auto_minmax(0,1fr)] lg:items-center">
        <div className="rounded-2xl bg-muted/50 border border-border p-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">A staffer asks Compass</div>
          <p className="font-serif text-lg text-foreground leading-snug">“Draft a renewal note for Adriatica Grupa.”</p>
        </div>
        <div className="flex lg:flex-col items-center gap-2 text-muted-foreground justify-center">
          <span className="rounded-xl ink bg-foreground text-background px-3 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"><Lock className="w-3.5 h-3.5" /> Privacy router</span>
          <ArrowRight className="w-5 h-5 rotate-90 lg:rotate-0" />
        </div>
        <div className="space-y-3">
          {ROUTE_EXAMPLE.map((r) => (
            <div key={r.tier} className={cn('rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3', r.verdict === 'blocked' ? 'border-dashed border-border bg-muted/30' : 'border-border bg-background')}>
              <div className="sm:w-44 shrink-0 flex items-center gap-2">
                <TierChip tier={r.tier} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs md:text-[13px] text-foreground leading-relaxed break-words">{r.payload}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  {r.verdict === 'blocked' ? <X className="w-3.5 h-3.5 text-destructive" /> : <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  {r.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DataClassTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-left text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">
            <th className="p-4 font-bold">Data</th>
            {!compact && <th className="p-4 font-bold">Examples</th>}
            <th className="p-4 font-bold">Sensitivity</th>
            <th className="p-4 font-bold">Processed by</th>
            <th className="p-4 font-bold">Rule</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {DATA_CLASSES.map((d) => (
            <tr key={d.name} className="align-top">
              <td className="p-4 font-bold text-foreground whitespace-nowrap">{d.name}</td>
              {!compact && <td className="p-4 text-muted-foreground">{d.examples}</td>}
              <td className="p-4 text-foreground whitespace-nowrap">{d.sensitivity}</td>
              <td className="p-4"><TierChip tier={d.tier} /></td>
              <td className="p-4 text-muted-foreground">{d.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
