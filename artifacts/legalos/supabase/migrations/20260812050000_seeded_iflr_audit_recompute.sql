-- Companion to 20260812040000_seeded_iflr_standings_backfill.sql, mirroring
-- 20260812030000_census_iflr_audit_recompute.sql: the 29 seeded firms whose
-- IFLR1000 standings were just backfilled have frozen audit rows in
-- market_visibility_audits, and the leaderboard reads those persisted scores
-- (the merge suppresses directory rows matching an audit domain), so the
-- backfill alone would never surface. This patch mirrors the
-- metric-corrections path (metricCorrections.ts + recomputeFromRawMetrics.ts):
--   * reputation.iflr1000RankedTables := the verified tables
--   * reputation.iflr1000 sub-score := recomputed count/avgRank/points;
--     qualityStats stays NULL (no frozen IFLR peer stats existed at audit
--     time, so no quality bonus is fabricated). Points are count-only:
--     min(10, 10 * count / n) with Serbia iflr n=2 — one table = 5.0, two
--     tables = 10.0.
--   * reputation.directoryLastVerifiedAt := 2026-08-12
--   * reputation_score += the iflr points delta (was 0); total_score is a
--     generated column and follows automatically.
-- The guard (existing iflr1000 count = 0) makes re-running this file a no-op.

WITH patch(domain, tables, points, avg_rank) AS (
  VALUES
    ('bdkadvokati.com',           '{"FC":1,"PD":1}'::jsonb, 10.0, 1.0),
    ('jpm.law',                   '{"FC":1,"PD":1}'::jsonb, 10.0, 1.0),
    ('karanovicpartners.com',     '{"FC":1,"PD":1}'::jsonb, 10.0, 1.0),
    ('schoenherr.rs',             '{"FC":1,"PD":1}'::jsonb, 10.0, 1.0),
    ('wolftheiss.com',            '{"FC":1,"PD":2}'::jsonb, 10.0, 1.5),
    ('bopa.rs',                   '{"FC":2,"PD":2}'::jsonb, 10.0, 2.0),
    ('mvj.rs',                    '{"FC":2,"PD":2}'::jsonb, 10.0, 2.0),
    ('cms.law',                   '{"FC":2,"PD":2}'::jsonb, 10.0, 2.0),
    ('doklestic.law',             '{"FC":2}'::jsonb,         5.0, 2.0),
    ('harrison-solicitors.com',   '{"FC":2,"PD":4}'::jsonb, 10.0, 3.0),
    ('sog.rs',                    '{"FC":2,"PD":3}'::jsonb, 10.0, 2.5),
    ('d2plaw.com',                '{"FC":3,"PD":5}'::jsonb, 10.0, 4.0),
    ('mmd-associates.com',        '{"FC":3,"PD":5}'::jsonb, 10.0, 4.0),
    ('jsplaw.co.rs',              '{"FC":3,"PD":3}'::jsonb, 10.0, 3.0),
    ('pricapartners.com',         '{"FC":3,"PD":4}'::jsonb, 10.0, 3.5),
    ('nstlaw.rs',                 '{"FC":3,"PD":4}'::jsonb, 10.0, 3.5),
    ('deloitte.com',              '{"FC":4,"PD":3}'::jsonb, 10.0, 3.5),
    ('djokicpartners.rs',         '{"FC":4}'::jsonb,         5.0, 4.0),
    ('nko-law.com',               '{"FC":4}'::jsonb,         5.0, 4.0),
    ('rspartners.rs',             '{"FC":4,"PD":4}'::jsonb, 10.0, 4.0),
    ('vp.rs',                     '{"FC":4,"PD":5}'::jsonb, 10.0, 4.5),
    ('zsp-legal.com',             '{"FC":4,"PD":5}'::jsonb, 10.0, 4.5),
    ('avs.legal',                 '{"FC":5,"PD":4}'::jsonb, 10.0, 4.5),
    ('zslaw.rs',                  '{"FC":5}'::jsonb,         5.0, 5.0),
    ('vujinovicpartners.rs',      '{"FC":5}'::jsonb,         5.0, 5.0),
    ('vuliclaw.com',              '{"FC":5}'::jsonb,         5.0, 5.0),
    ('nkp.rs',                    '{"PD":2}'::jsonb,         5.0, 2.0),
    ('mim-law.com',               '{"PD":4}'::jsonb,         5.0, 4.0),
    ('bit-law.com',               '{"PD":5}'::jsonb,         5.0, 5.0)
)
UPDATE public.market_visibility_audits a
SET raw_metrics = jsonb_set(
      jsonb_set(
        jsonb_set(a.raw_metrics, '{reputation,iflr1000RankedTables}', p.tables),
        '{reputation,iflr1000}',
        jsonb_build_object(
          'points', p.points,
          'count', jsonb_array_length(jsonb_path_query_array(p.tables, '$.keyvalue()')),
          'avgRank', p.avg_rank,
          'qualityStats', NULL
        )
      ),
      '{reputation,directoryLastVerifiedAt}', to_jsonb('2026-08-12'::text)
    ),
    reputation_score = a.reputation_score + p.points,
    updated_at = now()
FROM patch p
WHERE a.market = 'serbia'
  AND a.audited_domain = p.domain
  AND COALESCE((a.raw_metrics #>> '{reputation,iflr1000,count}')::int, 0) = 0;
