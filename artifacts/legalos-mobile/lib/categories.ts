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
    { key: 'performance',       label: 'Performance',         score: firm.performance,       max: 20, color: '#5B8AF0', provenance: firm.provenance.performance },
    { key: 'social',            label: 'Social Media',        score: firm.social,            max: 20, color: '#7C6FE0', provenance: firm.provenance.social },
    { key: 'seoAuthority',      label: 'SEO & Authority',     score: firm.seoAuthority,      max: 60, color: '#E07C4A', provenance: firm.provenance.seoAuthority },
    { key: 'thoughtLeadership', label: 'Thought Leadership',  score: firm.thoughtLeadership, max: 45, color: '#4BAF8A', provenance: firm.provenance.thoughtLeadership },
    { key: 'reputation',        label: 'Reputation',          score: firm.reputation,        max: 55, color: '#C4A035', provenance: firm.provenance.reputation },
  ];
}
