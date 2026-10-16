-- Companion to 20260812020000_census_directory_standings_verification.sql:
-- the 8 census firms (with domains) whose IFLR1000 standings were backfilled
-- have frozen audit rows in market_visibility_audits, and the leaderboard
-- reads those persisted scores — so the directory backfill alone would never
-- surface. This patch mirrors exactly what the metric-corrections path does
-- (metricCorrections.ts + recomputeFromRawMetrics.ts):
--   * reputation.iflr1000RankedTables := the verified tables
--   * reputation.iflr1000 sub-score := recomputed count/avgRank/points;
--     qualityStats stays NULL (no frozen IFLR peer stats existed at audit
--     time — every peer was empty — so no quality bonus is fabricated).
--     Points are count-only: min(10, 10 * count / n) with Serbia iflr n=2,
--     i.e. one table = 5.0, two tables = 10.0.
--   * reputation.directoryLastVerifiedAt := 2026-08-12
--   * reputation_score += the iflr points delta (was 0); total_score is a
--     generated column and follows automatically.
-- Law Office Kosic has no domain and therefore no audit row; its verified
-- ranking lives in market_directory_data only.

WITH patch(domain, tables, points, avg_rank) AS (
  VALUES
    ('ap-legal.rs',           '{"FC":4}'::jsonb,        5.0, 4.0),
    ('lawofficealeksicbg.rs', '{"FC":4,"PD":5}'::jsonb, 10.0, 4.5),
    ('spasicpartners.com',    '{"FC":4}'::jsonb,        5.0, 4.0),
    ('andrejic.rs',           '{"FC":5,"PD":5}'::jsonb, 10.0, 5.0),
    ('lawmilos.com',          '{"FC":5}'::jsonb,        5.0, 5.0),
    ('marjanovic.law',        '{"FC":5}'::jsonb,        5.0, 5.0),
    ('tasiclaw.com',          '{"FC":5,"PD":3}'::jsonb, 10.0, 4.0),
    ('t-s.legal',             '{"FC":5}'::jsonb,        5.0, 5.0)
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
