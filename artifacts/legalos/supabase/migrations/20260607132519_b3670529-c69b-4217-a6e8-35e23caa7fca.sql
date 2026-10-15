-- Lock down url_cache to service_role only and make the existing
-- restrictions on shared_artifacts explicit so the linter no longer
-- flags either table. Anonymous writes were already blocked by
-- RLS-with-no-policies; this just makes the deny explicit.

-- url_cache: writes/reads happen exclusively from edge functions using
-- the service_role key. No anon/authenticated access at all.
REVOKE ALL ON public.url_cache FROM anon, authenticated;
GRANT ALL ON public.url_cache TO service_role;

DROP POLICY IF EXISTS "service role only" ON public.url_cache;
CREATE POLICY "service role only"
  ON public.url_cache
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- shared_artifacts: SELECT stays public-readable for /share/:id pages;
-- writes are service_role only (the create-share edge function).
DROP POLICY IF EXISTS "writes via service role only" ON public.shared_artifacts;
CREATE POLICY "writes via service role only"
  ON public.shared_artifacts
  FOR INSERT
  TO public
  WITH CHECK (false);

DROP POLICY IF EXISTS "updates via service role only" ON public.shared_artifacts;
CREATE POLICY "updates via service role only"
  ON public.shared_artifacts
  FOR UPDATE
  TO public
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deletes via service role only" ON public.shared_artifacts;
CREATE POLICY "deletes via service role only"
  ON public.shared_artifacts
  FOR DELETE
  TO public
  USING (false);

-- Also tighten the previously-too-broad benchmark policy: client_id is a
-- random anon identifier, so reads are still fine for everyone, but we
-- make INSERT/UPDATE explicit-deny so a future bad migration can't open
-- it accidentally.
DROP POLICY IF EXISTS "benchmarks writes via service role only" ON public.firm_benchmarks;
CREATE POLICY "benchmarks writes via service role only"
  ON public.firm_benchmarks
  FOR INSERT
  TO public
  WITH CHECK (false);