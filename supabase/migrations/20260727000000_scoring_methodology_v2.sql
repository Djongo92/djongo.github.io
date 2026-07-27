-- ===========================================================================
-- Scoring methodology v2 (CLAUDE.md §2/§3): 90th-percentile peer
-- normalization replaces peer-maximum normalization, and every stored audit
-- now carries the data-integrity metadata needed to audit a score rather
-- than just trust it.
--
-- IMPORTANT: this migration only ADDS columns, with defaults chosen so
-- existing rows are backfilled with accurate METADATA, never a changed
-- SCORE. methodology_version defaults to 1 because every row that already
-- exists really was produced by the old peer-maximum formula — that's a
-- true fact about that row, not a rewrite of it. No existing
-- performance_score / social_score / seo_authority_score /
-- thought_leadership_score / reputation_score / total_score value is
-- touched by this migration. Going forward, a methodology change bumps
-- METHODOLOGY_VERSION in code and scores forward from that point; it never
-- reaches back and edits a past result.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- market_visibility_audits — the live/current row per (client, domain, market)
-- ---------------------------------------------------------------------------
ALTER TABLE public.market_visibility_audits
  ADD COLUMN methodology_version   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN data_window_start     TIMESTAMPTZ,
  ADD COLUMN data_window_end       TIMESTAMPTZ,
  ADD COLUMN sample_size           INTEGER,
  ADD COLUMN confidence_score      NUMERIC CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  ADD COLUMN review_status         TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'reviewed', 'flagged')),
  ADD COLUMN reviewed_by           TEXT,
  ADD COLUMN manual_override       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN manual_override_reason TEXT;

COMMENT ON COLUMN public.market_visibility_audits.methodology_version IS
  'Which scoring formula version produced this row''s current scores — bump only when the formula itself changes, not when a data source is added.';
COMMENT ON COLUMN public.market_visibility_audits.data_window_start IS
  'Start of the data window this audit drew from (e.g. the content-window lookback for Thought Leadership).';
COMMENT ON COLUMN public.market_visibility_audits.data_window_end IS
  'End of the data window this audit drew from — the moment the audit ran.';
COMMENT ON COLUMN public.market_visibility_audits.sample_size IS
  'Smallest peer-comparison sample size behind any of this audit''s peer-normalized metrics — the weakest link.';
COMMENT ON COLUMN public.market_visibility_audits.confidence_score IS
  'Fraction (0-1) of this audit''s peer-normalized metrics that met the minimum sample rule (see percentileFormula.ts, MIN_PEER_SAMPLE).';
COMMENT ON COLUMN public.market_visibility_audits.review_status IS
  'Manual QA workflow state — set by a human reviewer, never by the scoring pipeline itself.';
COMMENT ON COLUMN public.market_visibility_audits.reviewed_by IS
  'Free-text identifier of whoever last reviewed this audit (no Supabase Auth FK — reviewers may not be app account holders).';
COMMENT ON COLUMN public.market_visibility_audits.manual_override IS
  'True if any value in this audit was manually corrected after automated scoring.';
COMMENT ON COLUMN public.market_visibility_audits.manual_override_reason IS
  'Why a manual override was made — required context, never a silent correction.';

-- ---------------------------------------------------------------------------
-- market_visibility_audit_history — append-only; historical rows are
-- immutable, so only the columns describing what produced each snapshot are
-- added here. review_status/reviewed_by/manual_override are live-row
-- workflow state, not applicable to an already-recorded snapshot.
-- ---------------------------------------------------------------------------
ALTER TABLE public.market_visibility_audit_history
  ADD COLUMN methodology_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN data_window_start   TIMESTAMPTZ,
  ADD COLUMN data_window_end     TIMESTAMPTZ,
  ADD COLUMN sample_size         INTEGER,
  ADD COLUMN confidence_score    NUMERIC CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

COMMENT ON COLUMN public.market_visibility_audit_history.methodology_version IS
  'Which scoring formula version produced THIS snapshot — fixed forever once written, so a trend chart can tell a real score change apart from two methodologies side by side.';
