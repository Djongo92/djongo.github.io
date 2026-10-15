/**
 * Firm → per-category view model, moved out of DataContext so the audit-load
 * seam (lib/auditData.ts) can use it without a runtime import cycle.
 * Re-exported from DataContext, so existing consumers (ShareCard, FirmRow,
 * screens) keep importing from '@/context/DataContext' unchanged.
 * Type-only import from DataContext — erased at compile time, no cycle.
 */
import type { Category, Firm } from '@/context/DataContext';

export function getCategories(firm: Firm): Category[] {
  return [
    { key: 'performance',       label: 'Website Experience',  score: firm.performance,       max: 50, color: '#5B8AF0', provenance: firm.provenance.performance },
    { key: 'social',            label: 'Social Presence',     score: firm.social,            max: 75, color: '#7C6FE0', provenance: firm.provenance.social },
    { key: 'seoAuthority',      label: 'Search Authority',    score: firm.seoAuthority,      max: 100, color: '#E07C4A', provenance: firm.provenance.seoAuthority },
    { key: 'thoughtLeadership', label: 'Thought Leadership',  score: firm.thoughtLeadership, max: 150, color: '#4BAF8A', provenance: firm.provenance.thoughtLeadership },
    { key: 'reputation',        label: 'Recognition',         score: firm.reputation,        max: 125, color: '#C4A035', provenance: firm.provenance.reputation },
  ];
}
