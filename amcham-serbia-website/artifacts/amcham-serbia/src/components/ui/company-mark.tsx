import { cn } from '@/lib/utils';

// Sector-tinted monogram used wherever a member company appears. Companies are
// rounded squares and people stay circles, so the two never read as the same thing.
// Class strings are spelled out in full so Tailwind's scanner picks them up.
const SECTOR_TONE: Record<string, string> = {
  Manufacturing: 'bg-slate-500/15 text-slate-700 ring-slate-500/25 dark:bg-slate-400/15 dark:text-slate-200',
  Energy: 'bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-200',
  Pharma: 'bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:bg-emerald-400/15 dark:text-emerald-200',
  IT: 'bg-sky-500/15 text-sky-800 ring-sky-500/25 dark:bg-sky-400/15 dark:text-sky-200',
  Finance: 'bg-indigo-500/15 text-indigo-800 ring-indigo-500/25 dark:bg-indigo-400/15 dark:text-indigo-200',
  Banking: 'bg-indigo-500/15 text-indigo-800 ring-indigo-500/25 dark:bg-indigo-400/15 dark:text-indigo-200',
  FMCG: 'bg-rose-500/15 text-rose-800 ring-rose-500/25 dark:bg-rose-400/15 dark:text-rose-200',
  Retail: 'bg-fuchsia-500/15 text-fuchsia-800 ring-fuchsia-500/25 dark:bg-fuchsia-400/15 dark:text-fuchsia-200',
  Consulting: 'bg-violet-500/15 text-violet-800 ring-violet-500/25 dark:bg-violet-400/15 dark:text-violet-200',
  Legal: 'bg-teal-500/15 text-teal-800 ring-teal-500/25 dark:bg-teal-400/15 dark:text-teal-200',
  Logistics: 'bg-orange-500/15 text-orange-800 ring-orange-500/25 dark:bg-orange-400/15 dark:text-orange-200',
  Services: 'bg-cyan-500/15 text-cyan-800 ring-cyan-500/25 dark:bg-cyan-400/15 dark:text-cyan-200',
};
const FALLBACK_TONE = 'bg-muted text-muted-foreground ring-border';

const SIZES = {
  xs: 'w-6 h-6 rounded-md text-[9px]',
  sm: 'w-8 h-8 rounded-lg text-[11px]',
  md: 'w-10 h-10 rounded-xl text-sm',
  lg: 'w-14 h-14 rounded-2xl text-lg',
  xl: 'w-20 h-20 rounded-[24px] text-2xl',
  '2xl': 'w-24 h-24 rounded-[28px] text-3xl',
} as const;

const SKIP = new Set(['&', 'a.d.', 'and', 'co', 'd.o.o.', 'serbia', 'group']);

export function companyInitials(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);
  const first = words[0] || '?';
  // Acronym-style names (SBB, KPMG, PwC, NIS) keep their own letters.
  if (first.length <= 4 && (first.match(/[A-Z]/g) || []).length >= 2) return first;
  const significant = words.filter((w) => !SKIP.has(w.toLowerCase()) && /\p{L}/u.test(w[0]));
  const letters = significant.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return letters || first[0].toUpperCase();
}

interface CompanyMarkProps {
  name?: string;
  sector?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export function CompanyMark({ name = '?', sector, size = 'md', className }: CompanyMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'shrink-0 inline-flex items-center justify-center font-bold tracking-tight ring-1 ring-inset select-none',
        SIZES[size],
        (sector && SECTOR_TONE[sector]) || FALLBACK_TONE,
        className,
      )}
    >
      {companyInitials(name)}
    </div>
  );
}
