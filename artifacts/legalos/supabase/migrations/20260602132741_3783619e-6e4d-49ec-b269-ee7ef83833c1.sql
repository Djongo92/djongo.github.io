-- ===========================================================================
-- Shared artifacts: read-only branded pages at /share/:id
-- ===========================================================================
CREATE TABLE public.shared_artifacts (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind         TEXT NOT NULL,                       -- 'roast' | 'autopsy' | 'audit' | 'teardown' | 'headline' | 'bio' | 'maturity' | 'roadmap' | 'pitch' | 'calendar' | 'copy'
  title        TEXT NOT NULL,
  source_url   TEXT,                                -- optional URL the artifact references
  payload      JSONB NOT NULL,                      -- the full result rendered on the share page
  view_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ                          -- optional expiry; null = permanent
);

-- Grants: anyone can read a share link; only service_role (via edge fn) writes.
GRANT SELECT ON public.shared_artifacts TO anon;
GRANT SELECT ON public.shared_artifacts TO authenticated;
GRANT ALL    ON public.shared_artifacts TO service_role;

ALTER TABLE public.shared_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired shared artifacts"
ON public.shared_artifacts
FOR SELECT
USING (expires_at IS NULL OR expires_at > now());

-- No insert/update/delete policies → only service_role bypasses RLS.

CREATE INDEX idx_shared_artifacts_created_at ON public.shared_artifacts (created_at DESC);

-- ===========================================================================
-- URL cache: dedupe expensive edge-function fetches (roast/teardown/audit) for 24h
-- ===========================================================================
CREATE TABLE public.url_cache (
  cache_key    TEXT NOT NULL PRIMARY KEY,           -- sha256(fn_name + '|' + normalized_url + '|' + variant)
  fn_name      TEXT NOT NULL,
  url          TEXT NOT NULL,
  response     JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Grants: cache is service-only; the client never queries it directly.
GRANT ALL ON public.url_cache TO service_role;

ALTER TABLE public.url_cache ENABLE ROW LEVEL SECURITY;

-- No policies → no role except service_role (which bypasses RLS) can read/write.

CREATE INDEX idx_url_cache_fn_expires ON public.url_cache (fn_name, expires_at);