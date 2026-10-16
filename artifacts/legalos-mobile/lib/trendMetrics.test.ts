import { describe, it, expect } from 'vitest';
import {
  performanceTrendMetric,
  socialTrendMetric,
  seoTrendMetric,
  thoughtLeadershipTrendMetric,
  reputationTrendMetric,
  historyEvidenceLine,
  historyRowDisplay,
} from './trendMetrics';

describe('trend metric formatters', () => {
  it('performance needs both desktop and mobile scores — no partial fabrication', () => {
    expect(performanceTrendMetric({ desktop: { performance: 70 }, mobile: { performance: 60 }, perfAvg: 65 })).toBe('65 PageSpeed avg');
    expect(performanceTrendMetric({ desktop: { performance: 70 }, mobile: { performance: 60 } })).toBe('65 PageSpeed avg');
    expect(performanceTrendMetric({ desktop: { performance: 70 } })).toBeNull();
    expect(performanceTrendMetric(null)).toBeNull();
  });

  it('social needs a followers count', () => {
    expect(socialTrendMetric({ followers: 1850 })).toBe('1,850 followers');
    expect(socialTrendMetric({ posts30d: 4 })).toBeNull();
    expect(socialTrendMetric(undefined)).toBeNull();
  });

  it('seo never fabricates — not configured in this build', () => {
    expect(seoTrendMetric({ domainAuthority: { value: 32 } })).toBeNull();
  });

  it('thought leadership needs a posts count, with singular/plural', () => {
    expect(thoughtLeadershipTrendMetric({ postsCount: 1 })).toBe('1 post');
    expect(thoughtLeadershipTrendMetric({ postsCount: 4 })).toBe('4 posts');
    expect(thoughtLeadershipTrendMetric({})).toBeNull();
  });

  it('reputation prefers the GBP rating, then ranked tables, then the listed flag', () => {
    expect(reputationTrendMetric({ gbpRating: 4.6 })).toBe('★ 4.6 GBP');
    expect(reputationTrendMetric({ chambers: { count: 2 }, legal500: { count: 1 } })).toBe('3 ranked tables');
    expect(reputationTrendMetric({ gbpListed: true })).toBe('GBP listed');
    expect(reputationTrendMetric({ gbpListed: false })).toBeNull();
    expect(reputationTrendMetric(null)).toBeNull();
  });
});

describe('historyEvidenceLine', () => {
  const raw = {
    performance: { desktop: { performance: 70 }, mobile: { performance: 60 }, perfAvg: 65 },
    social: { followers: 1850 },
    seoAuthority: { domainAuthority: { value: 32 } },
    thoughtLeadership: { postsCount: 2 },
    reputation: { gbpRating: 4.6 },
  };
  const fullProvenance = {
    performance: 'api', social: 'api', seoAuthority: 'api', thoughtLeadership: 'api', reputation: 'api',
  };

  it('joins every measured category with the web separator', () => {
    expect(historyEvidenceLine(raw, fullProvenance))
      .toBe('65 PageSpeed avg · 1,850 followers · 2 posts · ★ 4.6 GBP');
  });

  it('omits a category whose provenance is "missing" — never a fabricated raw value', () => {
    const line = historyEvidenceLine(raw, { ...fullProvenance, social: 'missing' });
    expect(line).not.toContain('followers');
    expect(line).toContain('65 PageSpeed avg');
  });

  it('treats absent provenance (older rows) as missing rather than assumed measured', () => {
    expect(historyEvidenceLine(raw, null)).toBeNull();
    expect(historyEvidenceLine(raw, { social: 'api' })).toBe('1,850 followers');
  });

  it('skips a measured category whose inputs simply were not recorded on this snapshot', () => {
    expect(historyEvidenceLine({ social: { followers: 900 } }, fullProvenance)).toBe('900 followers');
  });

  it('returns null when rawMetrics is absent', () => {
    expect(historyEvidenceLine(null, fullProvenance)).toBeNull();
    expect(historyEvidenceLine(undefined, fullProvenance)).toBeNull();
  });
});

describe('historyRowDisplay (audit log row rules)', () => {
  const raw = { social: { followers: 1850 } };
  const provenance = { social: 'api' };

  it('shows the confidence line on a full-confidence point too — not just thin ones', () => {
    const row = historyRowDisplay({ rawMetrics: raw, provenance, confidenceScore: 1, sampleSize: 14 });
    expect(row.confidence).toBe('100% confidence · smallest sample 14 firms');
    expect(row.thin).toBe(false);
    expect(row.evidence).toBe('1,850 followers');
  });

  it('flags a thin-sampled point and keeps its sample size visible', () => {
    const row = historyRowDisplay({ rawMetrics: raw, provenance, confidenceScore: 0.6, sampleSize: 3 });
    expect(row.confidence).toBe('60% confidence · smallest sample 3 firms');
    expect(row.thin).toBe(true);
  });

  it('omits the confidence line entirely when none was recorded (older rows)', () => {
    const row = historyRowDisplay({ rawMetrics: raw, provenance, confidenceScore: null, sampleSize: null });
    expect(row.confidence).toBeNull();
    expect(row.thin).toBe(false);
  });
});
