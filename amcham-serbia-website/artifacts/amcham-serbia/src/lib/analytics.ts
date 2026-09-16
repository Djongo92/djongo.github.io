import { Company } from '@/data/platform';
import { parseEuro } from './utils';

const MONTH_ORDER: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function monthSortKey(label: string): number {
  const [mon, yr] = label.replace("'", '').split(' ');
  return (2000 + parseInt(yr, 10)) * 12 + MONTH_ORDER[mon];
}

export interface TrendPoint {
  month: string;
  avgScore: number;
  avgEngagement: number;
}

// The original 20 companies' history runs Oct '24 - Sep '26; the 20 added in
// the data-depth pass run Jan '25 - Dec '26. Averaging across all of them is
// only meaningful where every company actually has a value, so this only
// returns months present in every company's history rather than silently
// blending a 20-company average with a 40-company one at the edges.
export function commonMonthlyTrend(companies: Company[]): TrendPoint[] {
  const byMonth = new Map<string, { scoreSum: number; engSum: number; count: number }>();
  for (const c of companies) {
    for (const h of c.history) {
      const bucket = byMonth.get(h.month) || { scoreSum: 0, engSum: 0, count: 0 };
      bucket.scoreSum += h.score;
      bucket.engSum += h.engagement;
      bucket.count += 1;
      byMonth.set(h.month, bucket);
    }
  }
  const total = companies.length;
  return Array.from(byMonth.entries())
    .filter(([, v]) => v.count === total)
    .map(([month, v]) => ({ month, avgScore: v.scoreSum / v.count, avgEngagement: v.engSum / v.count }))
    .sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
}

export interface SegmentStat {
  key: string;
  count: number;
  avgScore: number;
  totalFee: number;
  atRisk: number;
}

export function segmentBreakdown(companies: Company[], by: 'sector' | 'tier' | 'lifecycle'): SegmentStat[] {
  const map = new Map<string, Company[]>();
  for (const c of companies) {
    const k = String(c[by]);
    const arr = map.get(k) || [];
    arr.push(c);
    map.set(k, arr);
  }
  return Array.from(map.entries())
    .map(([key, comps]) => ({
      key,
      count: comps.length,
      avgScore: Math.round(comps.reduce((s, c) => s + c.score, 0) / comps.length),
      totalFee: comps.reduce((s, c) => s + parseEuro(c.fee), 0),
      atRisk: comps.filter(c => c.lifecycle === 'at-risk').length,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface CohortStat {
  year: number;
  count: number;
  avgScore: number;
  active: number;
  renewing: number;
  atRisk: number;
  onboarding: number;
}

export function cohortsByJoinYear(companies: Company[]): CohortStat[] {
  const map = new Map<number, Company[]>();
  for (const c of companies) {
    const arr = map.get(c.since) || [];
    arr.push(c);
    map.set(c.since, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, comps]) => ({
      year,
      count: comps.length,
      avgScore: Math.round(comps.reduce((s, c) => s + c.score, 0) / comps.length),
      active: comps.filter(c => c.lifecycle === 'active').length,
      renewing: comps.filter(c => c.lifecycle === 'renewing').length,
      atRisk: comps.filter(c => c.lifecycle === 'at-risk').length,
      onboarding: comps.filter(c => c.lifecycle === 'onboarding').length,
    }));
}
